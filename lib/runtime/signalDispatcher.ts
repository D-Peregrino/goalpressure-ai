/**
 * Runtime signal dispatcher — pressure metrics → decision engine → Supabase → Telegram.
 */

import type { Match, MarketType, Signal } from "@/types/domain";
import {
  deriveSignalConfidence,
  deriveStake,
  getMarketLabel,
  getMatchLabel,
} from "@/types/domain";
import {
  evaluateSignalOpportunity,
  markSignalDispatchCooldown,
  metricsFromLiveRecord,
  type SignalOpportunityEvaluation,
} from "@/lib/engine/signalDecisionEngine";
import { dispatchLiveSignalsToTelegram } from "@/lib/engine/telegram/liveDispatchBridge";
import { buildMatchEngineInsight } from "@/lib/engine/signals/liveSignalGenerator";
import type { MatchEngineInsight } from "@/types/engine";
import { persistSignalDispatchBatch } from "@/lib/live/signalDispatchPersistence";
import type { LiveMetricRecord } from "@/lib/runtime/liveRuntime";
import { recordRuntimeOpsLog } from "@/lib/ops/opsStore";
import { getMetaConsensusForFixture } from "@/lib/meta/metaSnapshot";
import { isMetaTelegramApproved } from "@/lib/meta/metaConsensusEngine";
import { logOps } from "@/lib/utils/logger";
const LOG_SCOPE = "runtime-signal-dispatcher";

export interface RuntimeActiveSignal {
  fixtureId: string;
  matchId: string;
  matchLabel: string;
  minute: number;
  market: string;
  pressureScore: number;
  momentum: number;
  goalProbability: number;
  confidence: number;
  ev: number;
  fairOdd: number;
  currentOdd: number;
  urgency: number;
  reasons: string[];
}

export interface RuntimeSignalOpsSnapshot {
  updatedAt: string;
  evaluated: number;
  triggered: number;
  dispatched: number;
  blocked: number;
  averageEv: number;
  approvalRate: number;
  activeSignals: RuntimeActiveSignal[];
}

export interface ProcessRuntimeSignalCycleInput {
  matches: Match[];
  metrics: LiveMetricRecord[];
  modelId: string;
  dispatchTelegram?: boolean;
}

export interface ProcessRuntimeSignalCycleResult {
  evaluated: number;
  triggered: number;
  dispatched: number;
  blocked: number;
  signals: Signal[];
  snapshot: RuntimeSignalOpsSnapshot;
}

interface GlobalSignalRuntimeSlot {
  snapshot: RuntimeSignalOpsSnapshot | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_SIGNAL_RUNTIME__: GlobalSignalRuntimeSlot | undefined;
}

function getSlot(): GlobalSignalRuntimeSlot {
  if (!globalThis.__GP_SIGNAL_RUNTIME__) {
    globalThis.__GP_SIGNAL_RUNTIME__ = { snapshot: null };
  }
  return globalThis.__GP_SIGNAL_RUNTIME__;
}

export function getRuntimeSignalOpsSnapshot(): RuntimeSignalOpsSnapshot | null {
  return getSlot().snapshot;
}

function metricsByMatchId(
  metrics: LiveMetricRecord[]
): Map<string, LiveMetricRecord> {
  const map = new Map<string, LiveMetricRecord>();
  for (const m of metrics) {
    map.set(m.matchId, m);
    map.set(m.fixtureId, m);
  }
  return map;
}

function evaluationToSignal(
  match: Match,
  evaluation: SignalOpportunityEvaluation
): Signal | null {
  if (!evaluation.shouldTrigger) return null;

  const market = evaluation.market as MarketType;
  const pressureScore = Math.round(
    match.pressure?.score ?? evaluation.confidence * 100
  );
  const confidence =
    deriveSignalConfidence(pressureScore) ??
    (evaluation.confidence >= 0.8 ? "HIGH" : "MEDIUM");

  return {
    matchId: match.id,
    matchLabel: getMatchLabel(match),
    market,
    confidence,
    reason: `${getMarketLabel(market)} · EV+${(evaluation.ev * 100).toFixed(1)}% · ${evaluation.reason.join(" · ")}`,
    stake: deriveStake(confidence),
    pressureScore,
    odd: evaluation.currentOdd,
  };
}

function logLiveSignal(
  fixtureId: string,
  evaluation: SignalOpportunityEvaluation,
  metrics: LiveMetricRecord,
  dispatched: boolean
): void {
  logOps(
    LOG_SCOPE,
    `[live-signal] fixture=${fixtureId} market=${evaluation.market} EV=${evaluation.ev.toFixed(3)} conf=${(evaluation.confidence * 100).toFixed(0)}% P=${metrics.pressureScore} M=${metrics.momentum} sent=${dispatched}`
  );
}

/**
 * Ciclo completo: decision engine → persistência → Telegram (opcional).
 */
export async function processRuntimeSignalCycle(
  input: ProcessRuntimeSignalCycleInput
): Promise<ProcessRuntimeSignalCycleResult> {
  const metricMap = metricsByMatchId(input.metrics);
  const persistInputs: Parameters<typeof persistSignalDispatchBatch>[0] = [];
  const activeSignals: RuntimeActiveSignal[] = [];
  const signals: Signal[] = [];
  const insights: MatchEngineInsight[] = [];

  let evaluated = 0;
  let triggered = 0;
  let blocked = 0;
  let dispatched = 0;
  let evSum = 0;

  for (const match of input.matches) {
    const record =
      metricMap.get(match.id) ??
      metricMap.get(match.externalId ?? "") ??
      null;

    if (!record) continue;

    evaluated += 1;
    const decisionMetrics = metricsFromLiveRecord(record);
    const evaluation = evaluateSignalOpportunity(match, decisionMetrics);
    const fixtureId = record.fixtureId;

    const metaConsensus = getMetaConsensusForFixture(fixtureId);
    const metaApproved =
      !metaConsensus || isMetaTelegramApproved(metaConsensus);

    const telegramWillSend =
      evaluation.shouldTrigger &&
      input.dispatchTelegram !== false &&
      metaApproved;

    if (evaluation.shouldTrigger) {
      triggered += 1;
      evSum += evaluation.ev;

      if (
        evaluation.reason.includes("cooldown_active") ||
        !metaApproved
      ) {
        blocked += 1;
      } else {
        activeSignals.push({
          fixtureId,
          matchId: match.id,
          matchLabel: record.matchLabel,
          minute: record.minute,
          market: evaluation.market,
          pressureScore: record.pressureScore,
          momentum: record.momentum,
          goalProbability: record.goalProbability,
          confidence: evaluation.confidence,
          ev: evaluation.ev,
          fairOdd: evaluation.fairOdd,
          currentOdd: evaluation.currentOdd,
          urgency: evaluation.urgency,
          reasons: evaluation.reason,
        });

        const signal = evaluationToSignal(match, evaluation);
        if (signal) {
          signals.push(signal);
          insights.push(buildMatchEngineInsight(match));
          markSignalDispatchCooldown(fixtureId, evaluation.market);
        }
      }
    }

    logLiveSignal(fixtureId, evaluation, record, telegramWillSend);

    const goalsAtTrigger =
      match.score != null
        ? (match.score.home ?? 0) + (match.score.away ?? 0)
        : 0;

    const reasons = [...evaluation.reason];
    if (evaluation.shouldTrigger && !metaApproved) {
      reasons.push(
        metaConsensus
          ? `meta_${metaConsensus.executionDecision}`
          : "meta_not_ready"
      );
    }

    persistInputs.push({
      fixtureId,
      market: evaluation.market,
      pressureScore: record.pressureScore,
      momentum: record.momentum,
      goalProbability: record.goalProbability,
      confidence: evaluation.confidence,
      ev: evaluation.ev,
      fairOdd: evaluation.fairOdd,
      marketOdd: evaluation.currentOdd,
      triggered:
        evaluation.shouldTrigger &&
        !evaluation.reason.includes("cooldown_active") &&
        metaApproved,
      telegramSent: false,
      metadata: {
        match_id: match.id,
        match_label: record.matchLabel,
        minute: record.minute,
        goals_at_trigger: goalsAtTrigger,
        urgency: evaluation.urgency,
        reasons,
        source: "signal_decision_engine",
        meta_grade: metaConsensus?.executionGrade,
        meta_decision: metaConsensus?.executionDecision,
        meta_consensus_score: metaConsensus?.consensusScore,
      },
    });
  }

  if (signals.length > 0 && input.dispatchTelegram !== false) {
    const queueSize = dispatchLiveSignalsToTelegram(
      signals,
      input.modelId,
      insights
    );
    dispatched = signals.length;
    void queueSize;

    for (const row of persistInputs) {
      if (row.triggered) {
        row.telegramSent = true;
      }
    }
  }

  await persistSignalDispatchBatch(persistInputs);

  const approvalRate =
    evaluated > 0 ? round3(triggered / evaluated) : 0;
  const averageEv = triggered > 0 ? round3(evSum / triggered) : 0;

  const snapshot: RuntimeSignalOpsSnapshot = {
    updatedAt: new Date().toISOString(),
    evaluated,
    triggered,
    dispatched,
    blocked,
    averageEv,
    approvalRate,
    activeSignals: activeSignals.sort((a, b) => b.ev - a.ev),
  };

  getSlot().snapshot = snapshot;

  await recordRuntimeOpsLog({
    event: "signal_decision_cycle",
    message: `[live-signal] evaluated=${evaluated} triggered=${triggered} dispatched=${dispatched}`,
    metadata: { ...snapshot },
  });

  return {
    evaluated,
    triggered,
    dispatched,
    blocked,
    signals,
    snapshot,
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
