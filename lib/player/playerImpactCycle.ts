/**
 * Ciclo live de player impact — integrado ao runtime.
 */

import type { Match } from "@/types/domain";
import type { LiveMetricRecord } from "@/lib/runtime/liveRuntime";
import { buildPlayerImpactInputFromMatch } from "@/lib/player/playerContextBuilder";
import { calculatePlayerImpact } from "@/lib/player/playerImpactEngine";
import { persistPlayerRuntimeMetricsBatch } from "@/lib/player/playerPersistence";
import { setPlayerOpsSnapshot } from "@/lib/player/playerSnapshot";
import type { PlayerImpactResult } from "@/types/player";
import { logOps } from "@/lib/utils/logger";
import { recordRuntimeOpsLog } from "@/lib/ops/opsStore";

const LOG_SCOPE = "player-impact-cycle";

export interface ProcessPlayerImpactCycleInput {
  matches: Match[];
  metrics: LiveMetricRecord[];
}

export interface ProcessPlayerImpactCycleResult {
  processed: number;
  persisted: number;
  snapshot: ReturnType<typeof setPlayerOpsSnapshot>;
  results: PlayerImpactResult[];
}

/**
 * Pré-ciclo — popula snapshot para Signal/Market/Temporal (sem persistir).
 */
export function processPlayerImpactPreCycle(
  input: ProcessPlayerImpactCycleInput
): PlayerImpactResult[] {
  const metricSet = new Set(input.metrics.map((m) => m.fixtureId));
  const results: PlayerImpactResult[] = [];

  for (const match of input.matches) {
    const fixtureId = match.externalId ?? match.id.replace(/^sm-/, "");
    if (!metricSet.has(fixtureId)) continue;

    const impact = calculatePlayerImpact(buildPlayerImpactInputFromMatch(match));
    results.push(impact);
  }

  setPlayerOpsSnapshot(results);
  return results;
}

/**
 * Ciclo completo com persistência Supabase.
 */
export async function processPlayerImpactLiveCycle(
  input: ProcessPlayerImpactCycleInput
): Promise<ProcessPlayerImpactCycleResult> {
  const results = processPlayerImpactPreCycle(input);

  for (const r of results) {
    if (r.clutchFactor >= 60 || r.flags.length > 0) {
      logOps(
        LOG_SCOPE,
        `[player-impact] fixture=${r.fixtureId} clutch=${r.clutchFactor} gk=${r.goalkeeperResistance} subSwing=${r.substitutionSwing} chaos=${r.chaosContribution} flags=${r.flags.join(",")}`
      );
    }
  }

  const persist = await persistPlayerRuntimeMetricsBatch(results);
  const snapshot = setPlayerOpsSnapshot(results);

  await recordRuntimeOpsLog({
    event: "player_impact_cycle",
    message: `[player-impact] processed=${results.length} clutch_alerts=${snapshot.fatigueAlerts.length}`,
    metadata: {
      topClutch: snapshot.topClutchPlayers[0]?.name,
      avgGk: snapshot.goalkeeperResistance[0]?.value,
    },
  });

  logOps(LOG_SCOPE, "[player-impact] cycle complete", {
    processed: results.length,
    persisted: persist.persisted,
  });

  return {
    processed: results.length,
    persisted: persist.persisted,
    snapshot,
    results,
  };
}
