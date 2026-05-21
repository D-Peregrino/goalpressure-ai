/**
 * Persists JSON artifacts + analytics so /analytics /research /ops stay populated.
 */

import { appendMatchTimeline } from "@/lib/storage/matchTimelineStorage";
import { saveLiveSnapshotAsync } from "@/lib/storage/snapshotStorage";
import { trackSignalOutcomes } from "@/lib/storage/signalOutcomeStorage";
import { generateSignalAnalytics } from "@/lib/analytics/signalAnalytics";
import { refreshLiveDashboardMetrics } from "@/lib/analytics/refreshLiveDashboardMetrics";
import { logInfo, logWarn } from "@/lib/utils/logger";
import type { LiveMatchesApiMeta } from "@/types/api";
import type { Match, Signal } from "@/types/domain";

const LOG_SCOPE = "sync-live-artifacts";

export async function syncLiveCycleArtifacts(
  matches: Match[],
  signals: Signal[],
  meta: LiveMatchesApiMeta
): Promise<void> {
  if (matches.length === 0 && signals.length === 0) return;

  try {
    await appendMatchTimeline(matches, signals, meta);
    await trackSignalOutcomes(matches, signals, meta);
    saveLiveSnapshotAsync(matches, signals, meta);

    if (signals.length > 0) {
      await generateSignalAnalytics();
      await refreshLiveDashboardMetrics({
        matchesMonitored: matches.length,
        signalsGenerated: signals.length,
        matches,
        signals,
      });
    }

    logInfo(LOG_SCOPE, "Live cycle artifacts synced", {
      matches: matches.length,
      signals: signals.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logWarn(LOG_SCOPE, "Artifact sync failed", { message });
  }
}
