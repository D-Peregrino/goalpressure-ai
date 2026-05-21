/**
 * Ciclo temporal live — integra pressure, market edge e match state.
 */

import type { Match } from "@/types/domain";
import type { FavoriteStatus } from "@/types/temporal";
import type { LiveMetricRecord } from "@/lib/runtime/liveRuntime";
import type { MarketEdgeCalibration } from "@/types/market";
import { calculateTemporalDynamics } from "@/lib/temporal/temporalDynamicsEngine";
import { persistTemporalMetricsBatch } from "@/lib/temporal/temporalPersistence";
import { setTemporalOpsSnapshot } from "@/lib/temporal/temporalSnapshot";
import { getPlayerImpactForFixture } from "@/lib/player/playerSnapshot";
import { playerChaosBoost } from "@/lib/player/playerImpactEngine";
import { getMicroeventForFixture } from "@/lib/microevent/microeventSnapshot";
import { microeventTemporalBoost } from "@/lib/microevent/microeventEngine";
import { getSequenceMemoryForFixture } from "@/lib/sequence/sequenceSnapshot";
import { sequenceTemporalBoost } from "@/lib/sequence/sequenceMemoryEngine";
import type { TemporalDynamicsResult } from "@/types/temporal";
import { logOps } from "@/lib/utils/logger";
import { recordRuntimeOpsLog } from "@/lib/ops/opsStore";

const LOG_SCOPE = "temporal-dynamics-cycle";

function resolveFixtureId(match: Match): string {
  return match.externalId ?? match.id.replace(/^sm-/, "");
}

function inferFavoriteStatus(match: Match): FavoriteStatus {
  const homePoss = match.teamStats?.home.possession;
  const awayPoss = match.teamStats?.away.possession;
  if (homePoss != null && awayPoss != null) {
    if (homePoss - awayPoss >= 8) return "HOME";
    if (awayPoss - homePoss >= 8) return "AWAY";
  }
  if ((match.stats.possession ?? 50) >= 58) return "HOME";
  if ((match.stats.possession ?? 50) <= 42) return "AWAY";
  return "NEUTRAL";
}

function buildTemporalInput(
  match: Match,
  metric: LiveMetricRecord,
  marketEdge?: number
): Parameters<typeof calculateTemporalDynamics>[0] {
  return {
    fixtureId: metric.fixtureId,
    matchId: match.id,
    matchLabel: metric.matchLabel,
    minute: match.minute,
    pressureScore: metric.pressureScore,
    momentum: metric.momentum,
    goalProbability: metric.goalProbability,
    marketEdge,
    matchState: match.status,
    scoreline: match.score,
    homeRedCards: 0,
    awayRedCards: 0,
    xgDelta: match.stats.xG != null ? Math.max(0, match.stats.xG * 0.1) : 0,
    favoriteStatus: inferFavoriteStatus(match),
  };
}

function strongestEdgeForFixture(
  fixtureId: string,
  edges: MarketEdgeCalibration[]
): number {
  const relevant = edges.filter((e) => e.fixtureId === fixtureId);
  if (relevant.length === 0) return 0;
  return Math.max(...relevant.map((e) => e.edge));
}

export interface ProcessTemporalCycleInput {
  matches: Match[];
  metrics: LiveMetricRecord[];
  marketEdges?: MarketEdgeCalibration[];
}

export interface ProcessTemporalCycleResult {
  processed: number;
  persisted: number;
  snapshot: ReturnType<typeof setTemporalOpsSnapshot>;
  results: TemporalDynamicsResult[];
}

/**
 * Pré-ciclo (sem market edge) — antes do signal decision.
 */
export function processTemporalPreCycle(
  input: ProcessTemporalCycleInput
): TemporalDynamicsResult[] {
  const metricMap = new Map(input.metrics.map((m) => [m.fixtureId, m]));
  const results: TemporalDynamicsResult[] = [];

  for (const match of input.matches) {
    const fixtureId = resolveFixtureId(match);
    const metric = metricMap.get(fixtureId);
    if (!metric) continue;

    const temporal = calculateTemporalDynamics(
      buildTemporalInput(match, metric, 0)
    );
    results.push(temporal);
  }

  setTemporalOpsSnapshot(results);
  return results;
}

/**
 * Ciclo completo pós-market — persiste com edge e atualiza ops.
 */
export async function processTemporalLiveCycle(
  input: ProcessTemporalCycleInput
): Promise<ProcessTemporalCycleResult> {
  const metricMap = new Map(input.metrics.map((m) => [m.fixtureId, m]));
  const edges = input.marketEdges ?? [];
  const results: TemporalDynamicsResult[] = [];

  for (const match of input.matches) {
    const fixtureId = resolveFixtureId(match);
    const metric = metricMap.get(fixtureId);
    if (!metric) continue;

    const edge = strongestEdgeForFixture(fixtureId, edges);
    let temporal = calculateTemporalDynamics(
      buildTemporalInput(match, metric, edge)
    );

    const playerImpact = getPlayerImpactForFixture(fixtureId);
    if (playerImpact) {
      const chaosBoost = playerChaosBoost(playerImpact);
      const boostedChaos = Math.min(100, temporal.chaosIndex + chaosBoost);
      const boostedVolatility = Math.min(
        100,
        temporal.volatilityScore + chaosBoost * 0.5
      );
      const flags = [...temporal.flags];
      if (playerImpact.flags.includes("RED_CARD_CASCADE")) {
        flags.push("PLAYER_RED_CASCADE");
      }
      if (playerImpact.fatigueImpact >= 65) {
        flags.push("PLAYER_FATIGUE");
      }
      temporal = {
        ...temporal,
        chaosIndex: boostedChaos,
        volatilityScore: boostedVolatility,
        flags,
      };
    }

    const microevent = getMicroeventForFixture(fixtureId);
    if (microevent) {
      const microBoost = microeventTemporalBoost(microevent);
      const flags = [...temporal.flags];
      if (microevent.flags.includes("CHAOS_BURST")) {
        flags.push("MICROEVENT_CHAOS");
      }
      if (microevent.flags.includes("RAPID_TRANSITION")) {
        flags.push("MICROEVENT_TRANSITION");
      }
      temporal = {
        ...temporal,
        chaosIndex: Math.min(100, temporal.chaosIndex + microBoost),
        accelerationScore: Math.min(
          100,
          temporal.accelerationScore + microevent.attackWaveIntensity * 0.08
        ),
        urgencyMultiplier: Math.min(
          2,
          temporal.urgencyMultiplier +
            (microevent.microeventScore >= 70 ? 0.08 : 0.03)
        ),
        flags,
      };
    }

    const sequenceMemory = getSequenceMemoryForFixture(fixtureId);
    if (sequenceMemory) {
      const seqBoost = sequenceTemporalBoost(sequenceMemory);
      const flags = [...temporal.flags];
      if (sequenceMemory.flags.includes("CHAOS_CYCLES")) {
        flags.push("SEQUENCE_CHAOS");
      }
      if (sequenceMemory.flags.includes("OFFENSIVE_CYCLES")) {
        flags.push("SEQUENCE_OFFENSIVE_CYCLE");
      }
      temporal = {
        ...temporal,
        chaosIndex: Math.min(100, temporal.chaosIndex + seqBoost),
        temporalPressure: Math.min(
          100,
          temporal.temporalPressure + sequenceMemory.recurrenceScore * 0.06
        ),
        flags,
      };
    }

    results.push(temporal);

    if (temporal.executionPriority !== "LOW") {
      logOps(
        LOG_SCOPE,
        `[temporal-dynamics] fixture=${fixtureId} min=${temporal.minute} phase=${temporal.matchPhase} chaos=${temporal.chaosIndex} urgency=${temporal.urgencyMultiplier} priority=${temporal.executionPriority} flags=${temporal.flags.join(",")}`
      );
    }
  }

  const persist = await persistTemporalMetricsBatch(results);
  const snapshot = setTemporalOpsSnapshot(results);

  await recordRuntimeOpsLog({
    event: "temporal_dynamics_cycle",
    message: `[temporal-dynamics] processed=${results.length} critical=${snapshot.criticalCount}`,
    metadata: {
      averageChaos: snapshot.averageChaos,
      averageVolatility: snapshot.averageVolatility,
      topChaos: snapshot.topChaos?.fixtureId,
    },
  });

  logOps(LOG_SCOPE, "[temporal-dynamics] cycle complete", {
    processed: results.length,
    persisted: persist.persisted,
    critical: snapshot.criticalCount,
    avgChaos: snapshot.averageChaos,
  });

  return {
    processed: results.length,
    persisted: persist.persisted,
    snapshot,
    results,
  };
}
