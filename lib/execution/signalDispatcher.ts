import type { Match, Signal } from "@/types/domain";
import type {
  DispatchCandidate,
  DispatchSignalSource,
  ExecutedDispatch,
  ExecutionDispatcherInput,
  ExecutionDispatcherResult,
  DispatchEngineSnapshot,
} from "@/lib/execution/execution.types";
import { dedupSignals, pruneDedupMemory } from "@/lib/execution/dedupSignals";
import {
  isOnDispatchCooldown,
  markDispatchCooldown,
  pruneDispatchCooldowns,
} from "@/lib/execution/cooldownManager";
import { signalQueue } from "@/lib/execution/signalQueue";
import { buildInstitutionalDispatchMessage, buildPushNotification } from "@/lib/execution/notificationEngine";
import {
  sendTelegramBatchDigests,
  sendTelegramLiveDispatch,
} from "@/lib/execution/telegramLiveEngine";
import { persistLiveSignalDispatch } from "@/lib/execution/dispatchPersistence";
import {
  enqueuePendingPush,
  getDispatchRatePerHour,
  setDispatchSnapshot,
} from "@/lib/execution/dispatchSnapshotStore";
import { logDispatchMetric } from "@/lib/execution/dispatchLogger";
import { dispatchLiveSignalsToTelegram } from "@/lib/engine/telegram/liveDispatchBridge";
import { getActiveModelId } from "@/lib/signalEngine";
import { generateLiveSignals } from "@/lib/engine/signals/liveSignalGenerator";
import { logInfo } from "@/lib/utils/logger";

const LOG_SCOPE = "execution-dispatcher";
const MAX_EXECUTED_PER_BATCH = 12;
const MAX_FEED_ITEMS = 24;

function fixtureId(match: Match): string {
  return match.externalId ?? match.id.replace(/^sm-/, "") ?? match.id;
}

function scoreDisplay(match: Match): string {
  if (match.score) return `${match.score.home} – ${match.score.away}`;
  return "Ao vivo";
}

function candidateFromMatch(
  match: Match,
  source: DispatchSignalSource,
  signalType: string,
  market: string
): DispatchCandidate | null {
  const p = match.pressure?.score ?? 0;
  const ev = match.evEngine?.expectedValue.best;
  const ops = match.opsIntelligence;

  const auto = match.autonomousProfile;
  const th = auto?.adaptiveThresholds;

  if (auto && !auto.dispatchApproved) return null;
  if (source === "EV_ENGINE" && (ev?.evPercent ?? 0) < (th?.minEvPercent ?? 3)) return null;
  if (source === "OPS_LAYER" && !ops) return null;
  if (source === "PRESSURE_ENGINE" && p < (th?.minPressureScore ?? 62)) return null;
  if (
    source === "LEARNING_LAYER" &&
    (match.learningContext?.historicalEdge.score ?? 0) < 55
  ) {
    return null;
  }
  if ((auto?.falsePositiveRisk ?? 0) >= 78 && source !== "DOMAIN_SIGNAL") return null;

  const id = `${fixtureId(match)}-${signalType}-${Date.now()}`;

  return {
    id,
    fixtureId: fixtureId(match),
    matchId: match.id,
    matchLabel: `${match.homeTeam} x ${match.awayTeam}`,
    league: match.league,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    signalType,
    market,
    source,
    minute: match.minute,
    pressureScore: p,
    momentumScore: match.feedMeta?.offensiveEngine?.momentumScore ?? 0,
    chaosLevel: ops?.chaosLevel ?? match.chaosIndex ?? 0,
    accelerationScore: match.feedMeta?.offensiveEngine?.accelerationScore ?? 0,
    evPercent: ev?.evPercent ?? null,
    fairOdd: ev?.fairOdds ?? null,
    marketOdd: ev?.marketOdds ?? null,
    confidence: match.evEngine?.confidence.score ?? 50,
    gameState: ops?.gameState ?? null,
    temperature: ops?.temperature ?? null,
    riskContext: ops?.riskContext ?? null,
    narrative:
      ops?.narrative ??
      match.learningContext?.historicalEdge.label ??
      "Leitura operacional em atualização.",
    headline: ops?.headline ?? "Sinal quantitativo live",
    scoreDisplay: scoreDisplay(match),
  };
}

function buildDispatchCandidates(
  matches: Match[],
  signals: Signal[]
): DispatchCandidate[] {
  const candidates: DispatchCandidate[] = [];
  const matchById = new Map(matches.map((m) => [m.id, m]));

  for (const signal of signals) {
    const match = matchById.get(signal.matchId);
    if (!match) continue;

    const base = candidateFromMatch(
      match,
      "DOMAIN_SIGNAL",
      signal.reason.slice(0, 48),
      signal.market
    );
    if (!base) continue;

    candidates.push({
      ...base,
      domainSignal: signal,
      confidence:
        signal.confidence === "HIGH" ? 78 : signal.confidence === "MEDIUM" ? 55 : 35,
      headline: `Sinal ${signal.market} · ${match.homeTeam} x ${match.awayTeam}`,
    });
  }

  for (const match of matches) {
    const ev = match.evEngine?.expectedValue.best;
    if (ev && ev.evPercent >= 3) {
      const c = candidateFromMatch(match, "EV_ENGINE", ev.market as string, String(ev.market));
      if (c) candidates.push(c);
    }

    if (match.opsIntelligence && match.opsIntelligence.focusScore >= 55) {
      const c = candidateFromMatch(
        match,
        "OPS_LAYER",
        match.opsIntelligence.gameState,
        "OPS"
      );
      if (c) candidates.push(c);
    }

    if (match.pressure.score >= 68) {
      const c = candidateFromMatch(
        match,
        "PRESSURE_ENGINE",
        "PRESSURE_ALERT",
        "OVER_0_5"
      );
      if (c) candidates.push(c);
    }

    const edge = match.learningContext?.historicalEdge;
    if (edge && edge.score >= 62) {
      const c = candidateFromMatch(match, "LEARNING_LAYER", "HIST_EDGE", "CONTEXT");
      if (c) candidates.push(c);
    }
  }

  return candidates;
}

async function executeQueuedItem(
  item: ReturnType<typeof signalQueue>[number],
  options: { enableTelegram: boolean; enablePush: boolean }
): Promise<ExecutedDispatch> {
  let telegramSent = false;
  let pushSent = false;

  if (options.enablePush && item.routes.includes("push")) {
    const push = buildPushNotification(item);
    enqueuePendingPush(push);
    pushSent = true;
  }

  const executed: ExecutedDispatch = {
    ...item,
    dispatchedAt: new Date().toISOString(),
    telegramSent,
    pushSent,
    message: buildInstitutionalDispatchMessage(item),
  };

  markDispatchCooldown(item);
  void persistLiveSignalDispatch(executed);

  if (options.enableTelegram && item.routes.includes("telegram")) {
    void sendTelegramLiveDispatch(item).then((sent) => {
      executed.telegramSent = sent;
    });
  }

  for (const route of item.routes) {
    logDispatchMetric({
      fixture: item.fixtureId,
      signal: item.signalType,
      urgency: item.urgency,
      route,
      telegram: route === "telegram" ? telegramSent : undefined,
      push: route === "push" ? pushSent : undefined,
    });
  }

  return executed;
}

function buildSnapshot(
  executed: ExecutedDispatch[],
  queue: ReturnType<typeof signalQueue>,
  matches: Match[]
): DispatchEngineSnapshot {
  const criticalCount = executed.filter((e) => e.urgency === "CRITICAL").length;
  const evValues = executed
    .map((e) => e.evPercent)
    .filter((v): v is number => v != null);
  const avgEv =
    evValues.length > 0
      ? evValues.reduce((a, b) => a + b, 0) / evValues.length
      : 0;

  const heroCandidate = executed.find((e) => e.routes.includes("hero")) ?? executed[0];

  return {
    generatedAt: new Date().toISOString(),
    activeSignals: executed.length,
    queueSize: queue.length,
    criticalCount,
    telegramSentCount: executed.filter((e) => e.telegramSent).length,
    pushSentCount: executed.filter((e) => e.pushSent).length,
    dispatchRatePerHour: getDispatchRatePerHour(),
    avgEvPercent: Math.round(avgEv * 10) / 10,
    primaryFixtureId: heroCandidate?.fixtureId ?? null,
    feed: executed.slice(0, MAX_FEED_ITEMS),
    queue: queue.slice(0, MAX_FEED_ITEMS),
    monitoredFixtures: matches
      .filter((m) => m.pressure.score >= 45)
      .map((m) => fixtureId(m))
      .slice(0, 20),
  };
}

/**
 * Dispatcher operacional — fila, dedup, cooldown, routing, Telegram, push.
 */
export async function runExecutionDispatcher(
  input: ExecutionDispatcherInput
): Promise<ExecutionDispatcherResult> {
  pruneDedupMemory();
  pruneDispatchCooldowns();

  const raw = buildDispatchCandidates(input.matches, input.signals);
  const { unique, removed: skippedDedup } = dedupSignals(raw);

  const afterCooldown = unique.filter((c) => !isOnDispatchCooldown(c));
  const skippedCooldown = unique.length - afterCooldown.length;

  const queue = signalQueue(afterCooldown);
  const enableTelegram = input.enableTelegram !== false;
  const enablePush = input.enablePush !== false;

  const executed: ExecutedDispatch[] = [];

  for (const item of queue.slice(0, MAX_EXECUTED_PER_BATCH)) {
    executed.push(await executeQueuedItem(item, { enableTelegram, enablePush }));
  }

  const snapshot = buildSnapshot(executed, queue, input.matches);
  setDispatchSnapshot(snapshot);

  if (enableTelegram && executed.length > 0) {
    void sendTelegramBatchDigests(executed);
  }

  if (enableTelegram && input.signals.length > 0) {
    const { insights } = generateLiveSignals(input.matches);
    void dispatchLiveSignalsToTelegram(input.signals, getActiveModelId(), insights, {
      matches: input.matches,
    });
  }

  logInfo(LOG_SCOPE, "Execution batch complete", {
    candidates: raw.length,
    executed: executed.length,
    skippedDedup,
    skippedCooldown,
    critical: snapshot.criticalCount,
  });

  return {
    snapshot,
    executed: executed.length,
    skippedDedup,
    skippedCooldown,
  };
}

export function scheduleExecutionDispatcher(
  input: ExecutionDispatcherInput
): void {
  void runExecutionDispatcher(input).catch(() => {
    /* non-blocking */
  });
}

/** Alias público da missão. */
export const signalDispatcher = runExecutionDispatcher;
