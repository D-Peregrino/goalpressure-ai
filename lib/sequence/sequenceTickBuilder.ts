/**
 * Captura tick de runtime para o histórico sequencial.
 */

import type { Match } from "@/types/domain";
import type { LiveMetricRecord } from "@/lib/runtime/liveRuntime";
import { getTemporalDynamicsForFixture } from "@/lib/temporal/temporalSnapshot";
import { getPlayerImpactForFixture } from "@/lib/player/playerSnapshot";
import { getMicroeventForFixture } from "@/lib/microevent/microeventSnapshot";
import { getRuntimeSignalOpsSnapshot } from "@/lib/runtime/signalDispatcher";
import { getMarketCalibrationOpsSnapshot } from "@/lib/market/marketSnapshot";
import type { SequenceHistoryTick } from "@/types/sequence";

export function buildSequenceHistoryTick(
  match: Match,
  metric: LiveMetricRecord
): SequenceHistoryTick {
  const fixtureId = metric.fixtureId;
  const temporal = getTemporalDynamicsForFixture(fixtureId);
  const player = getPlayerImpactForFixture(fixtureId);
  const microevent = getMicroeventForFixture(fixtureId);
  const signalSnap = getRuntimeSignalOpsSnapshot();
  const marketSnap = getMarketCalibrationOpsSnapshot();

  const signalActive = Boolean(
    signalSnap?.activeSignals.some((s) => s.fixtureId === fixtureId)
  );

  const marketEdge = marketSnap?.edges.find((e) => e.fixtureId === fixtureId);

  return {
    minute: match.minute,
    timestamp: new Date().toISOString(),
    pressureScore: metric.pressureScore,
    momentum: metric.momentum,
    goalProbability: metric.goalProbability,
    chaosIndex: temporal?.chaosIndex ?? 0,
    microeventScore: microevent?.microeventScore ?? 0,
    playerOffensiveImpact: player?.offensiveImpact ?? 0,
    playerFatigueImpact: player?.fatigueImpact ?? 0,
    marketEdgePercent: marketEdge?.edgePercent ?? 0,
    signalActive,
  };
}
