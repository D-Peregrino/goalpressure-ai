/**
 * Ciclo live do Validation Lab — integrado ao runtime polling.
 */

import type { Match } from "@/types/domain";
import type { LiveMetricRecord } from "@/lib/runtime/liveRuntime";
import { buildLiveValidationInput } from "@/lib/validation/validationContextBuilder";
import {
  buildValidationLabSnapshot,
  calculateLiveValidation,
  LOG_SCOPE,
} from "@/lib/validation/liveValidationEngine";
import {
  persistValidationMetricsBatch,
  persistValidationSnapshot,
} from "@/lib/validation/validationPersistence";
import { setValidationOpsSnapshot } from "@/lib/validation/validationSnapshot";
import type { LiveValidationResult } from "@/types/validation";
import { logOps } from "@/lib/utils/logger";
import { recordRuntimeOpsLog } from "@/lib/ops/opsStore";

export interface ProcessValidationCycleInput {
  matches: Match[];
  metrics: LiveMetricRecord[];
}

export function processValidationPreCycle(
  input: ProcessValidationCycleInput
): LiveValidationResult[] {
  const metricMap = new Map(input.metrics.map((m) => [m.fixtureId, m]));
  const results: LiveValidationResult[] = [];

  for (const match of input.matches) {
    const fixtureId = match.externalId ?? match.id.replace(/^sm-/, "");
    const metric = metricMap.get(fixtureId);
    if (!metric) continue;

    results.push(
      calculateLiveValidation(buildLiveValidationInput(match, metric))
    );
  }

  return results;
}

export async function processValidationLiveCycle(
  input: ProcessValidationCycleInput
): Promise<{
  processed: number;
  persisted: number;
  snapshotSaved: boolean;
  snapshot: ReturnType<typeof setValidationOpsSnapshot>;
  results: LiveValidationResult[];
}> {
  const liveResults = processValidationPreCycle(input);

  for (const r of liveResults) {
    if (r.flags.length > 0 || r.validationScore < 50) {
      logOps(
        LOG_SCOPE,
        `[live-validation] fixture=${r.fixtureId} score=${r.validationScore} fp=${r.falsePositiveRisk} reliability=${r.reliability} flags=${r.flags.join(",")}`
      );
    }
  }

  const lab = await buildValidationLabSnapshot(liveResults);

  for (const s of lab.calibrationSuggestions) {
    logOps(
      LOG_SCOPE,
      `[live-validation] calibration suggestion: ${s.action} — ${s.title}`
    );
  }

  const persist = await persistValidationMetricsBatch(liveResults);
  const snapshotSaved = await persistValidationSnapshot(lab, "live_cycle");
  const snapshot = setValidationOpsSnapshot(lab, liveResults);

  await recordRuntimeOpsLog({
    event: "validation_cycle",
    message: `[live-validation] processed=${liveResults.length} trades=${lab.tradeCount} hit=${(lab.hitRate * 100).toFixed(0)}% suggestions=${lab.calibrationSuggestions.length}`,
    metadata: {
      averageValidationScore: snapshot.averageValidationScore,
      roi: lab.roi,
    },
  });

  logOps(LOG_SCOPE, "[live-validation] cycle complete", {
    processed: liveResults.length,
    persisted: persist.persisted,
    snapshotSaved,
    suggestions: lab.calibrationSuggestions.length,
  });

  return {
    processed: liveResults.length,
    persisted: persist.persisted,
    snapshotSaved,
    snapshot,
    results: liveResults,
  };
}
