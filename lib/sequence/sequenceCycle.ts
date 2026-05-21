/**
 * Ciclo live de sequence memory — integrado ao runtime.
 */

import type { Match } from "@/types/domain";
import type { LiveMetricRecord } from "@/lib/runtime/liveRuntime";
import {
  appendSequenceHistoryTick,
  getSequenceHistory,
} from "@/lib/sequence/sequenceHistoryStore";
import { buildSequenceHistoryTick } from "@/lib/sequence/sequenceTickBuilder";
import { buildSequenceMemoryInput } from "@/lib/sequence/sequenceContextBuilder";
import { analyzeSequenceMemory } from "@/lib/sequence/sequenceMemoryEngine";
import { persistSequenceMemoryMetricsBatch } from "@/lib/sequence/sequencePersistence";
import { setSequenceOpsSnapshot } from "@/lib/sequence/sequenceSnapshot";
import type { SequenceMemoryResult } from "@/types/sequence";
import { logOps } from "@/lib/utils/logger";
import { recordRuntimeOpsLog } from "@/lib/ops/opsStore";

const LOG_SCOPE = "sequence-memory-cycle";

export interface ProcessSequenceMemoryCycleInput {
  matches: Match[];
  metrics: LiveMetricRecord[];
}

export interface ProcessSequenceMemoryCycleResult {
  processed: number;
  persisted: number;
  snapshot: ReturnType<typeof setSequenceOpsSnapshot>;
  results: SequenceMemoryResult[];
}

/**
 * Pré-ciclo — acumula tick, analisa memória, expõe snapshot (sem persistir).
 */
export function processSequenceMemoryPreCycle(
  input: ProcessSequenceMemoryCycleInput
): SequenceMemoryResult[] {
  const metricMap = new Map(input.metrics.map((m) => [m.fixtureId, m]));
  const results: SequenceMemoryResult[] = [];

  for (const match of input.matches) {
    const fixtureId = match.externalId ?? match.id.replace(/^sm-/, "");
    const metric = metricMap.get(fixtureId);
    if (!metric) continue;

    const tick = buildSequenceHistoryTick(match, metric);
    appendSequenceHistoryTick(fixtureId, tick);
    const history = getSequenceHistory(fixtureId);

    const memory = analyzeSequenceMemory(
      buildSequenceMemoryInput(
        fixtureId,
        match.id,
        metric.matchLabel,
        match.minute,
        history
      )
    );
    results.push(memory);
  }

  setSequenceOpsSnapshot(results);
  return results;
}

/**
 * Ciclo completo com persistência Supabase.
 */
export async function processSequenceMemoryLiveCycle(
  input: ProcessSequenceMemoryCycleInput
): Promise<ProcessSequenceMemoryCycleResult> {
  const results = processSequenceMemoryPreCycle(input);

  for (const r of results) {
    if (r.recurrenceScore >= 50 || r.flags.length > 0) {
      logOps(
        LOG_SCOPE,
        `[sequence-memory] fixture=${r.fixtureId} state=${r.sequenceState} recurrence=${r.recurrenceScore} confidence=${r.memoryConfidence} fakeMom=${r.fakeMomentumProbability} flags=${r.flags.join(",")}`
      );
    }
  }

  const persist = await persistSequenceMemoryMetricsBatch(results);
  const snapshot = setSequenceOpsSnapshot(results);

  await recordRuntimeOpsLog({
    event: "sequence_memory_cycle",
    message: `[sequence-memory] processed=${results.length} avgRecurrence=${snapshot.averageRecurrenceScore} fake_alerts=${snapshot.fakeMomentumAlerts.length}`,
    metadata: {
      topState: snapshot.recurrenceLeaders[0]?.sequenceState,
      topRecurrence: snapshot.recurrenceLeaders[0]?.recurrenceScore,
    },
  });

  logOps(LOG_SCOPE, "[sequence-memory] cycle complete", {
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
