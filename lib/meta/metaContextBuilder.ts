/**
 * Agrega snapshots de todos os motores em input de meta consensus.
 */

import type { Match } from "@/types/domain";
import type { LiveMetricRecord } from "@/lib/runtime/liveRuntime";
import { getTemporalDynamicsForFixture } from "@/lib/temporal/temporalSnapshot";
import { getPlayerImpactForFixture } from "@/lib/player/playerSnapshot";
import { getMicroeventForFixture } from "@/lib/microevent/microeventSnapshot";
import { getSequenceMemoryForFixture } from "@/lib/sequence/sequenceSnapshot";
import { getMarketCalibrationOpsSnapshot } from "@/lib/market/marketSnapshot";
import { getBacktestOpsSnapshot } from "@/lib/backtest/backtestSnapshot";
import type { MetaConsensusInput } from "@/types/meta";

function strongestMarketEdge(fixtureId: string): {
  edgePercent: number;
  classification: string;
  expectedValue: number;
} | null {
  const snap = getMarketCalibrationOpsSnapshot();
  if (!snap) return null;
  const edges = snap.edges.filter((e) => e.fixtureId === fixtureId);
  if (edges.length === 0) return null;
  return [...edges].sort((a, b) => b.edgePercent - a.edgePercent)[0];
}

function backtestConfidenceScore(): number {
  const bt = getBacktestOpsSnapshot();
  if (!bt?.lastRun) return 45;
  const hit = bt.hitRate * 100;
  const roi = Math.min(100, Math.max(0, bt.roi * 100 + 50));
  const ev = Math.min(100, bt.averageEv * 500 + 50);
  return Math.round(hit * 0.4 + roi * 0.3 + ev * 0.3);
}

export function buildMetaConsensusInput(
  match: Match,
  metric: LiveMetricRecord
): MetaConsensusInput {
  const fixtureId = metric.fixtureId;
  const temporal = getTemporalDynamicsForFixture(fixtureId);
  const player = getPlayerImpactForFixture(fixtureId);
  const microevent = getMicroeventForFixture(fixtureId);
  const sequence = getSequenceMemoryForFixture(fixtureId);
  const marketEdge = strongestMarketEdge(fixtureId);

  const pressure = metric.pressureScore;
  const temporalScore = temporal?.temporalPressure ?? temporal?.chaosIndex ?? 40;
  const playerScore = player
    ? (player.offensiveImpact + player.clutchFactor) / 2
    : 40;
  const microScore = microevent?.microeventScore ?? 40;
  const seqScore = sequence?.recurrenceScore ?? 40;
  const marketScore = marketEdge
    ? Math.min(100, marketEdge.edgePercent * 8 + marketEdge.expectedValue * 40)
    : 40;
  const signalReadiness = roundScore(
    metric.goalProbability * 55 +
      metric.confidence * 35 +
      metric.momentum * 0.1
  );
  const backtestConfidence = backtestConfidenceScore();

  const fakeMomentum = sequence?.fakeMomentumProbability ?? 0;
  const edgeInconsistent =
    Boolean(marketEdge && marketEdge.edgePercent < 0 && pressure >= 60) ||
    Boolean(
      marketEdge &&
        marketEdge.classification === "IGNORE" &&
        microScore >= 65
    );
  const excessVolatility = temporal?.volatilityScore ?? 30;
  const lowHistoricalConfidence = Math.max(0, 100 - backtestConfidence);
  const engineConflict = computeEngineConflict(
    pressure,
    microScore,
    marketScore,
    temporal?.chaosIndex ?? 40
  );

  const scores = [
    pressure,
    temporalScore,
    playerScore,
    microScore,
    seqScore,
    marketScore,
  ];
  const fullAlignment = scores.every((s) => s >= 52);
  const persistence = sequence?.pressurePersistence ?? 0;
  const sustainedChaos = sequence?.sustainedChaosLevel ?? temporal?.chaosIndex ?? 0;
  const marketLag = Boolean(temporal?.flags.includes("MARKET_LAG"));
  const dominanceCycle = sequence?.lateGameDominance ?? 0;

  const flags: string[] = [];
  if (sequence?.sequenceState) flags.push(`SEQ_${sequence.sequenceState}`);
  if (temporal?.executionPriority) {
    flags.push(`TEMPORAL_${temporal.executionPriority}`);
  }
  if (microevent?.triggerWindow) {
    flags.push(`WINDOW_${microevent.triggerWindow}`);
  }

  return {
    fixtureId,
    matchId: match.id,
    matchLabel: metric.matchLabel,
    minute: match.minute,
    engines: {
      pressure,
      temporal: temporalScore,
      playerImpact: playerScore,
      microevent: microScore,
      sequenceMemory: seqScore,
      marketCalibration: marketScore,
      signalReadiness,
      backtestConfidence,
    },
    penalties: {
      fakeMomentum,
      edgeInconsistent,
      excessVolatility,
      lowHistoricalConfidence,
      engineConflict,
    },
    rewards: {
      fullAlignment,
      persistence,
      sustainedChaos,
      marketLag,
      dominanceCycle,
    },
    flags,
  };
}

function computeEngineConflict(
  pressure: number,
  micro: number,
  market: number,
  chaos: number
): number {
  let conflict = 0;
  if (pressure >= 65 && micro < 40) conflict += 35;
  if (micro >= 65 && pressure < 45) conflict += 25;
  if (market < 35 && pressure >= 60) conflict += 30;
  if (chaos >= 70 && pressure < 50) conflict += 20;
  return Math.min(100, conflict);
}

function roundScore(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)));
}
