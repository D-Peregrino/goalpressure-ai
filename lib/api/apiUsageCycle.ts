/**
 * Ciclo de snapshot API usage — integrado ao live polling.
 */

import {
  buildApiUsageSnapshot,
  LOG_SCOPE,
  recordPollingCycleSample,
} from "@/lib/api/apiUsageMonitor";
import { persistApiUsageSnapshotCycle } from "@/lib/api/apiUsagePersistence";
import type { ApiUsageSnapshot } from "@/types/apiUsage";
import { logOps } from "@/lib/utils/logger";
import { recordRuntimeOpsLog } from "@/lib/ops/opsStore";

export interface ProcessApiUsageCycleInput {
  intervalMs: number;
  activeFixtures: number;
  cacheHit: boolean;
}

export async function processApiUsageLiveCycle(
  input: ProcessApiUsageCycleInput
): Promise<{
  snapshot: ApiUsageSnapshot;
  persisted: boolean;
}> {
  recordPollingCycleSample({
    intervalMs: input.intervalMs,
    activeFixtures: input.activeFixtures,
    cacheHit: input.cacheHit,
  });

  const snapshot = buildApiUsageSnapshot(input.activeFixtures);
  const { persisted } = await persistApiUsageSnapshotCycle(snapshot);

  await recordRuntimeOpsLog({
    event: "api_usage_cycle",
    message: `[api-usage] ${snapshot.alertLevel} rpm=${snapshot.requestsPerMinute} monthProj=${snapshot.requestsMonthProjection} supportDays=${snapshot.planSupportDays ?? "n/a"}`,
    metadata: {
      utilization: snapshot.quotaUtilizationPercent,
      remaining: snapshot.estimatedRemainingQuota,
    },
    level: snapshot.alertLevel === "SAFE" ? "info" : "warn",
  });

  logOps(LOG_SCOPE, "[api-usage] cycle complete", {
    alert: snapshot.alertLevel,
    rpm: snapshot.requestsPerMinute,
    projected: snapshot.requestsMonthProjection,
    persisted,
  });

  return { snapshot, persisted };
}
