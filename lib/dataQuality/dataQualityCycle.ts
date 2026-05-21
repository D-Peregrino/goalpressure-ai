/**
 * Ciclo live de data quality.
 */

import type { Match } from "@/types/domain";
import {
  buildDataQualityInput,
  resetDataQualityFixtureRegistry,
} from "@/lib/dataQuality/dataQualityContextBuilder";
import { validateDataQuality } from "@/lib/dataQuality/dataQualityEngine";
import { persistDataQualityMetricsBatch } from "@/lib/dataQuality/dataQualityPersistence";
import { setDataQualityOpsSnapshot } from "@/lib/dataQuality/dataQualitySnapshot";
import type { DataQualityResult } from "@/types/dataQuality";
import { logOps } from "@/lib/utils/logger";
import { recordRuntimeOpsLog } from "@/lib/ops/opsStore";

const LOG_SCOPE = "data-quality-cycle";

export interface ProcessDataQualityCycleInput {
  matches: Match[];
  apiDelayMs?: number;
}

export function processDataQualityPreCycle(
  input: ProcessDataQualityCycleInput
): DataQualityResult[] {
  resetDataQualityFixtureRegistry();
  const results: DataQualityResult[] = [];

  for (const match of input.matches) {
    const quality = validateDataQuality(
      buildDataQualityInput(match, input.apiDelayMs)
    );
    results.push(quality);
  }

  setDataQualityOpsSnapshot(results);
  return results;
}

export async function processDataQualityLiveCycle(
  input: ProcessDataQualityCycleInput
): Promise<{
  processed: number;
  persisted: number;
  snapshot: ReturnType<typeof setDataQualityOpsSnapshot>;
  results: DataQualityResult[];
}> {
  const results = processDataQualityPreCycle(input);

  for (const r of results) {
    if (!r.usableForSignal || r.missingFields.length > 0) {
      logOps(
        LOG_SCOPE,
        `[data-quality] fixture=${r.fixtureId} score=${r.dataQualityScore} usable=${r.usableForSignal} missing=${r.missingFields.join(",")} stale=${r.staleRisk}`
      );
    }
  }

  const persist = await persistDataQualityMetricsBatch(results);
  const snapshot = setDataQualityOpsSnapshot(results);

  await recordRuntimeOpsLog({
    event: "data_quality_cycle",
    message: `[data-quality] processed=${results.length} unreliable=${snapshot.unreliableCount}`,
    metadata: { averageScore: snapshot.averageScore },
  });

  return {
    processed: results.length,
    persisted: persist.persisted,
    snapshot,
    results,
  };
}
