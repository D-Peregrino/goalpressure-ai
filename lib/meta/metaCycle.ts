/**
 * Ciclo live de meta consensus — integrado ao runtime.
 */

import type { Match } from "@/types/domain";
import type { LiveMetricRecord } from "@/lib/runtime/liveRuntime";
import { buildMetaConsensusInput } from "@/lib/meta/metaContextBuilder";
import { calculateMetaConsensus } from "@/lib/meta/metaConsensusEngine";
import { persistMetaConsensusMetricsBatch } from "@/lib/meta/metaPersistence";
import { setMetaOpsSnapshot } from "@/lib/meta/metaSnapshot";
import type { MetaConsensusResult } from "@/types/meta";
import { logOps } from "@/lib/utils/logger";
import { recordRuntimeOpsLog } from "@/lib/ops/opsStore";

const LOG_SCOPE = "meta-consensus-cycle";

export interface ProcessMetaConsensusCycleInput {
  matches: Match[];
  metrics: LiveMetricRecord[];
}

export interface ProcessMetaConsensusCycleResult {
  processed: number;
  persisted: number;
  approved: number;
  snapshot: ReturnType<typeof setMetaOpsSnapshot>;
  results: MetaConsensusResult[];
}

/**
 * Pré-ciclo — consenso antes de Signal/Telegram (sem persistir).
 */
export function processMetaConsensusPreCycle(
  input: ProcessMetaConsensusCycleInput
): MetaConsensusResult[] {
  const metricMap = new Map(input.metrics.map((m) => [m.fixtureId, m]));
  const results: MetaConsensusResult[] = [];

  for (const match of input.matches) {
    const fixtureId = match.externalId ?? match.id.replace(/^sm-/, "");
    const metric = metricMap.get(fixtureId);
    if (!metric) continue;

    const consensus = calculateMetaConsensus(
      buildMetaConsensusInput(match, metric)
    );
    results.push(consensus);
  }

  setMetaOpsSnapshot(results);
  return results;
}

/**
 * Ciclo completo com persistência (recalcula com market pós-calibração se disponível).
 */
export async function processMetaConsensusLiveCycle(
  input: ProcessMetaConsensusCycleInput
): Promise<ProcessMetaConsensusCycleResult> {
  const results = processMetaConsensusPreCycle(input);

  let approved = 0;
  for (const r of results) {
    if (
      r.executionDecision === "EXECUTE" ||
      r.executionDecision === "AGGRESSIVE_EXECUTE"
    ) {
      approved += 1;
    }
    if (r.consensusScore >= 50 || r.consensusFlags.length > 0) {
      logOps(
        LOG_SCOPE,
        `[meta-consensus] fixture=${r.fixtureId} grade=${r.executionGrade} decision=${r.executionDecision} score=${r.consensusScore} conf=${r.institutionalConfidence} fpRisk=${r.falsePositiveRisk} engines=${r.dominantEngines.join(",")} flags=${r.consensusFlags.join(",")}`
      );
    }
  }

  const persist = await persistMetaConsensusMetricsBatch(results);
  const snapshot = setMetaOpsSnapshot(results);

  await recordRuntimeOpsLog({
    event: "meta_consensus_cycle",
    message: `[meta-consensus] processed=${results.length} approved=${approved} avgScore=${snapshot.averageConsensusScore}`,
    metadata: {
      topGrade: snapshot.consensusHeatmap[0]?.executionGrade,
      topDecision: snapshot.consensusHeatmap[0]?.executionDecision,
      fpAlerts: snapshot.falsePositiveAlerts.length,
    },
  });

  logOps(LOG_SCOPE, "[meta-consensus] cycle complete", {
    processed: results.length,
    persisted: persist.persisted,
    approved,
  });

  return {
    processed: results.length,
    persisted: persist.persisted,
    approved,
    snapshot,
    results,
  };
}
