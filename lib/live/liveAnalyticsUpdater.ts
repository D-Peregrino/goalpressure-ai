/**
 * Fire-and-forget analytics pipeline refresh after live polling cycles.
 */

import { generateSignalAnalytics } from "@/lib/analytics/signalAnalytics";
import { compareModels } from "@/lib/analytics/modelComparison";
import { generateModelRecommendations } from "@/lib/analytics/modelRecommendations";
import { generateSignalSegmentations } from "@/lib/analytics/signalSegmentation";
import { runExperimentalEvaluationAsync } from "@/lib/experimental/experimentalSignalEngine";
import { recordRuntimeOpsLog } from "@/lib/ops/opsStore";
import { logInfo, logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "live-analytics-updater";
const MIN_ANALYTICS_INTERVAL_MS = 60_000;

let lastAnalyticsRunAt = 0;
let analyticsRunning = false;

export interface LiveAnalyticsUpdateResult {
  ran: boolean;
  skipped?: string;
  durationMs?: number;
}

async function runFullAnalyticsPipeline(): Promise<void> {
  const startedAt = Date.now();

  const { signalsProcessed } = await generateSignalAnalytics();
  await generateSignalSegmentations();
  await generateModelRecommendations();
  await compareModels();

  const durationMs = Date.now() - startedAt;

  logInfo(LOG_SCOPE, "Analytics pipeline updated", {
    signalsProcessed,
    durationMs,
  });

  await recordRuntimeOpsLog({
    event: "analytics_updated",
    message: `Analytics pipeline refreshed (${durationMs}ms)`,
    metadata: { signalsProcessed, durationMs },
  });
}

/**
 * Debounced analytics refresh — does not block live polling.
 */
export function scheduleLiveAnalyticsUpdate(): void {
  const now = Date.now();

  if (analyticsRunning) return;

  if (now - lastAnalyticsRunAt < MIN_ANALYTICS_INTERVAL_MS) {
    void recordRuntimeOpsLog({
      event: "analytics_skipped",
      message: "Analytics update skipped (debounce window)",
      metadata: { minIntervalMs: MIN_ANALYTICS_INTERVAL_MS },
    });
    return;
  }

  analyticsRunning = true;
  lastAnalyticsRunAt = now;

  void (async () => {
    try {
      await runFullAnalyticsPipeline();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logWarn(LOG_SCOPE, "Analytics update failed", { message });
      await recordRuntimeOpsLog({
        event: "analytics_failed",
        message: `Analytics update failed: ${message}`,
        level: "error",
      });
    } finally {
      analyticsRunning = false;
    }
  })();
}

/** Experimental snapshots (separate debounce via experimental engine). */
export function scheduleExperimentalUpdate(
  matches: Parameters<typeof runExperimentalEvaluationAsync>[0]
): void {
  if (matches.length === 0) return;
  runExperimentalEvaluationAsync(matches);
}
