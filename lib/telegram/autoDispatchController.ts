/**
 * GoalPressure AI — Auto Dispatch Controller (camada final Telegram).
 * Meta Consensus + Data Quality + cooldown + dedup + persistência.
 */

import type { Match, Signal } from "@/types/domain";
import { getMarketLabel } from "@/types/domain";
import type { LiveMetricRecord } from "@/lib/runtime/liveRuntime";
import type { MatchEngineInsight } from "@/types/engine";
import { getMetaConsensusForFixture } from "@/lib/meta/metaSnapshot";
import { isMetaTelegramApproved } from "@/lib/meta/metaConsensusEngine";
import { getDataQualityForFixture } from "@/lib/dataQuality/dataQualitySnapshot";
import { getTemporalDynamicsForFixture } from "@/lib/temporal/temporalSnapshot";
import { getSequenceMemoryForFixture } from "@/lib/sequence/sequenceSnapshot";
import { getMicroeventForFixture } from "@/lib/microevent/microeventSnapshot";
import { getRuntimeSignalOpsSnapshot } from "@/lib/runtime/signalDispatcher";
import { dispatchSignalsToTelegram, signalDispatcher } from "@/lib/telegram/signalDispatcher";
import { buildLiveDispatchFingerprint } from "@/lib/telegram/signalFormatter";
import { persistTelegramDispatchAudit } from "@/lib/telegram/telegramAutoDispatchPersistence";
import { logOps, logWarn } from "@/lib/utils/logger";
import type { TelegramDispatchResult } from "@/types/telegram";

const LOG_SCOPE = "auto-dispatch-controller";
const LIGHT_RETRY_MS = 800;

export interface AutoDispatchEnrichment {
  fairOdd?: number;
  ev?: number;
  pressure?: number;
  momentum?: number;
  chaos?: number;
  sequenceState?: string;
  executionGrade?: string;
  institutionalConfidence?: number;
  executionDecision?: string;
}

export interface AutoDispatchBatchInput {
  signals: Signal[];
  modelId: string;
  matches: Match[];
  metrics: LiveMetricRecord[];
  insights: MatchEngineInsight[];
}

export interface AutoDispatchBatchResult {
  submitted: number;
  dispatched: number;
  blocked: number;
  blockReasons: Record<string, string>;
  results: TelegramDispatchResult[];
}

interface GlobalAutoDispatchSlot {
  lastCycleAt: string | null;
  lastDispatched: number;
  lastBlocked: number;
  lastBatchSize: number;
  status: "IDLE" | "ACTIVE" | "DEGRADED";
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_AUTO_DISPATCH__: GlobalAutoDispatchSlot | undefined;
}

function getAutoDispatchSlot(): GlobalAutoDispatchSlot {
  if (!globalThis.__GP_AUTO_DISPATCH__) {
    globalThis.__GP_AUTO_DISPATCH__ = {
      lastCycleAt: null,
      lastDispatched: 0,
      lastBlocked: 0,
      lastBatchSize: 0,
      status: "IDLE",
    };
  }
  return globalThis.__GP_AUTO_DISPATCH__;
}

export function getAutoDispatchStatus(): GlobalAutoDispatchSlot {
  return { ...getAutoDispatchSlot() };
}

function buildEnrichment(
  signal: Signal,
  metrics: LiveMetricRecord[],
  matches: Match[]
): AutoDispatchEnrichment {
  const match = matches.find((m) => m.id === signal.matchId);
  const metric = metrics.find(
    (m) => m.matchId === signal.matchId || m.fixtureId === signal.matchId.replace(/^sm-/, "")
  );
  const fixtureId =
    metric?.fixtureId ?? signal.matchId.replace(/^sm-/, "");
  const meta = getMetaConsensusForFixture(fixtureId);
  const temporal = getTemporalDynamicsForFixture(fixtureId);
  const sequence = getSequenceMemoryForFixture(fixtureId);
  const microevent = getMicroeventForFixture(fixtureId);
  const active = getRuntimeSignalOpsSnapshot()?.activeSignals.find(
    (s) => s.fixtureId === fixtureId || s.matchId === signal.matchId
  );

  return {
    fairOdd: active?.fairOdd,
    ev: active?.ev,
    pressure: metric?.pressureScore ?? signal.pressureScore,
    momentum: metric?.momentum,
    chaos: temporal?.chaosIndex ?? microevent?.chaosBurst,
    sequenceState: sequence?.sequenceState,
    executionGrade: meta?.executionGrade,
    institutionalConfidence: meta?.institutionalConfidence,
    executionDecision: meta?.executionDecision,
  };
}

export function formatGoalPressureProfessionalMessage(
  signal: Signal,
  enrichment: AutoDispatchEnrichment,
  minute?: number
): string {
  const evPct =
    enrichment.ev != null ? `${(enrichment.ev * 100).toFixed(1)}%` : "—";
  const fairOdd =
    enrichment.fairOdd != null ? enrichment.fairOdd.toFixed(2) : "—";

  return [
    "GoalPressure AI Signal",
    "",
    `Jogo: ${signal.matchLabel}`,
    `Mercado: ${getMarketLabel(signal.market)}`,
    `Minuto: ${minute != null ? `${minute}'` : "—"}`,
    `Odd: ${signal.odd.toFixed(2)}`,
    `Fair odd: ${fairOdd}`,
    `EV: ${evPct}`,
    `Pressure: ${Math.round(enrichment.pressure ?? signal.pressureScore)}/100`,
    `Momentum: ${Math.round(enrichment.momentum ?? 0)}`,
    `Chaos: ${Math.round(enrichment.chaos ?? 0)}`,
    `Sequence State: ${enrichment.sequenceState ?? "—"}`,
    `Execution Grade: ${enrichment.executionGrade ?? "—"}`,
    `Confidence: ${signal.confidence}`,
    `Reason: ${signal.reason}`,
  ].join("\n");
}

export function canAutoDispatchSignal(
  fixtureId: string,
  market: string
): { allowed: boolean; reason: string } {
  const meta = getMetaConsensusForFixture(fixtureId);
  if (!meta) {
    return { allowed: false, reason: "meta_not_ready" };
  }
  if (!isMetaTelegramApproved(meta)) {
    return { allowed: false, reason: `meta_${meta.executionDecision}` };
  }

  const dq = getDataQualityForFixture(fixtureId);
  if (dq && !dq.usableForSignal) {
    return { allowed: false, reason: "data_quality_blocked" };
  }

  const stats = signalDispatcher.getQueueStats();
  if (stats.recentFingerprints > 200) {
    return { allowed: false, reason: "spam_guard" };
  }

  void buildLiveDispatchFingerprint(fixtureId, market as "OVER_0_5");
  return { allowed: true, reason: "approved" };
}

async function dispatchWithLightRetry(
  signals: Signal[],
  modelId: string,
  minuteByMatchId: Record<string, number>,
  momentumByMatchId: Record<string, string>,
  reasonByMatchId: Record<string, string>
): Promise<TelegramDispatchResult[]> {
  let results = dispatchSignalsToTelegram(signals, "production", modelId, {
    minuteByMatchId,
    momentumByMatchId,
    reasonByMatchId,
  });

  const failed = results.filter((r) => !r.queued && !r.skipped);
  if (failed.length > 0 && signals.length > 0) {
    await new Promise((r) => setTimeout(r, LIGHT_RETRY_MS));
    results = dispatchSignalsToTelegram(signals, "production", modelId, {
      minuteByMatchId,
      momentumByMatchId,
      reasonByMatchId,
    });
  }

  return results;
}

/**
 * Despacho institucional final — apenas sinais aprovados por Meta + Data Quality.
 */
export async function dispatchApprovedLiveSignals(
  input: AutoDispatchBatchInput
): Promise<AutoDispatchBatchResult> {
  const slot = getAutoDispatchSlot();
  slot.lastCycleAt = new Date().toISOString();
  slot.lastBatchSize = input.signals.length;
  slot.status = "ACTIVE";

  const approved: Signal[] = [];
  const blockReasons: Record<string, string> = {};
  const minuteByMatchId: Record<string, number> = {};
  const momentumByMatchId: Record<string, string> = {};
  const reasonByMatchId: Record<string, string> = {};

  for (const signal of input.signals) {
    const fixtureId = signal.matchId.replace(/^sm-/, "");
    const gate = canAutoDispatchSignal(fixtureId, signal.market);

    if (!gate.allowed) {
      blockReasons[signal.matchId] = gate.reason;
      logOps(
        LOG_SCOPE,
        `[auto-dispatch] blocked fixture=${fixtureId} reason=${gate.reason}`
      );
      await persistTelegramDispatchAudit({
        fixture_id: fixtureId,
        match_id: signal.matchId,
        market: signal.market,
        status: "blocked",
        block_reason: gate.reason,
        signal_id: signal.matchId,
      });
      continue;
    }

    const enrichment = buildEnrichment(signal, input.metrics, input.matches);
    const insight = input.insights.find((i) => i.matchId === signal.matchId);
    const minute = insight?.minute ?? input.matches.find((m) => m.id === signal.matchId)?.minute;

    minuteByMatchId[signal.matchId] = minute ?? 0;
    momentumByMatchId[signal.matchId] =
      enrichment.momentum != null ? String(Math.round(enrichment.momentum)) : "—";
    reasonByMatchId[signal.matchId] = formatGoalPressureProfessionalMessage(
      signal,
      enrichment,
      minute
    );

    approved.push(signal);

    logOps(
      LOG_SCOPE,
      `[auto-dispatch] approved fixture=${fixtureId} grade=${enrichment.executionGrade} decision=${enrichment.executionDecision}`
    );
  }

  let results: TelegramDispatchResult[] = [];
  if (approved.length > 0) {
    try {
      results = await dispatchWithLightRetry(
        approved,
        input.modelId,
        minuteByMatchId,
        momentumByMatchId,
        reasonByMatchId
      );

      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const sig = approved[i];
        if (!sig) continue;
        const fid = sig.matchId.replace(/^sm-/, "");
        if (r.queued) {
          await persistTelegramDispatchAudit({
            fixture_id: fid,
            match_id: sig.matchId,
            market: sig.market,
            status: "queued",
            signal_id: r.signalId,
          });
        } else if (r.skipped) {
          await persistTelegramDispatchAudit({
            fixture_id: fid,
            match_id: sig.matchId,
            market: sig.market,
            status: "skipped",
            block_reason: r.skipReason,
            signal_id: r.signalId,
          });
          logWarn(LOG_SCOPE, "[auto-dispatch] skipped", {
            signalId: r.signalId,
            reason: r.skipReason,
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "dispatch_failed";
      slot.status = "DEGRADED";
      logWarn(LOG_SCOPE, "[meta-consensus] auto-dispatch error", { message });
      for (const s of approved) {
        await persistTelegramDispatchAudit({
          fixture_id: s.matchId.replace(/^sm-/, ""),
          match_id: s.matchId,
          market: s.market,
          status: "error",
          block_reason: message,
          signal_id: s.matchId,
        });
      }
    }
  }

  const dispatched = results.filter((r) => r.queued).length;
  const blocked = input.signals.length - approved.length;

  slot.lastDispatched = dispatched;
  slot.lastBlocked = blocked;
  if (dispatched === 0 && approved.length > 0) {
    slot.status = "DEGRADED";
  }

  logOps(LOG_SCOPE, "[auto-dispatch] batch complete", {
    submitted: input.signals.length,
    approved: approved.length,
    dispatched,
    blocked,
  });

  return {
    submitted: input.signals.length,
    dispatched,
    blocked,
    blockReasons,
    results,
  };
}
