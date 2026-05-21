/**
 * Ciclo live de microevent detection — integrado ao runtime.
 */

import type { Match } from "@/types/domain";
import type { LiveMetricRecord } from "@/lib/runtime/liveRuntime";
import { getTemporalDynamicsForFixture } from "@/lib/temporal/temporalSnapshot";
import { getPlayerImpactForFixture } from "@/lib/player/playerSnapshot";
import { buildMicroeventInput } from "@/lib/microevent/microeventContextBuilder";
import { detectMicroevents } from "@/lib/microevent/microeventEngine";
import { getSequenceMemoryForFixture } from "@/lib/sequence/sequenceSnapshot";
import { sequenceMicroeventBoost } from "@/lib/sequence/sequenceMemoryEngine";
import { persistMicroeventMetricsBatch } from "@/lib/microevent/microeventPersistence";
import { setMicroeventOpsSnapshot } from "@/lib/microevent/microeventSnapshot";
import type { MicroeventDetectionResult } from "@/types/microevent";
import { logOps } from "@/lib/utils/logger";
import { recordRuntimeOpsLog } from "@/lib/ops/opsStore";

const LOG_SCOPE = "microevent-cycle";

export interface ProcessMicroeventCycleInput {
  matches: Match[];
  metrics: LiveMetricRecord[];
}

export interface ProcessMicroeventCycleResult {
  processed: number;
  persisted: number;
  snapshot: ReturnType<typeof setMicroeventOpsSnapshot>;
  results: MicroeventDetectionResult[];
}

/**
 * Pré-ciclo — snapshot para Signal, Market e Temporal (sem persistir).
 */
export function processMicroeventPreCycle(
  input: ProcessMicroeventCycleInput
): MicroeventDetectionResult[] {
  const metricMap = new Map(input.metrics.map((m) => [m.fixtureId, m]));
  const results: MicroeventDetectionResult[] = [];

  for (const match of input.matches) {
    const fixtureId = match.externalId ?? match.id.replace(/^sm-/, "");
    const metric = metricMap.get(fixtureId);
    if (!metric) continue;

    const temporal = getTemporalDynamicsForFixture(fixtureId);
    const player = getPlayerImpactForFixture(fixtureId);
    let detection = detectMicroevents(
      buildMicroeventInput(match, metric, temporal, player)
    );

    const priorSequence = getSequenceMemoryForFixture(fixtureId);
    if (priorSequence) {
      const boost = sequenceMicroeventBoost(priorSequence);
      if (boost > 0) {
        detection = {
          ...detection,
          microeventScore: Math.min(100, detection.microeventScore + boost),
        };
      }
    }

    results.push(detection);
  }

  setMicroeventOpsSnapshot(results);
  return results;
}

/**
 * Ciclo completo com persistência Supabase.
 */
export async function processMicroeventLiveCycle(
  input: ProcessMicroeventCycleInput
): Promise<ProcessMicroeventCycleResult> {
  const results = processMicroeventPreCycle(input);

  for (const r of results) {
    if (r.microeventScore >= 55 || r.flags.length > 0) {
      logOps(
        LOG_SCOPE,
        `[microevent-engine] fixture=${r.fixtureId} score=${r.microeventScore} window=${r.triggerWindow} chaos=${r.chaosBurst} waves=${r.attackWaveIntensity} flags=${r.flags.join(",")}`
      );
    }
  }

  const persist = await persistMicroeventMetricsBatch(results);
  const snapshot = setMicroeventOpsSnapshot(results);

  await recordRuntimeOpsLog({
    event: "microevent_cycle",
    message: `[microevent-engine] processed=${results.length} avgScore=${snapshot.averageMicroeventScore} collapse_alerts=${snapshot.collapseAlerts.length}`,
    metadata: {
      topWindow: snapshot.topTriggerWindows[0]?.triggerWindow,
      topScore: snapshot.topTriggerWindows[0]?.microeventScore,
    },
  });

  logOps(LOG_SCOPE, "[microevent-engine] cycle complete", {
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
