/**
 * Bridges live engine signals → real Telegram dispatcher.
 */

import type { Signal } from "@/types/domain";
import type { MatchEngineInsight } from "@/types/engine";
import type { Match } from "@/types/domain";
import type { LiveMetricRecord } from "@/lib/runtime/liveRuntime";
import { dispatchApprovedLiveSignals } from "@/lib/telegram/autoDispatchController";
import { signalDispatcher } from "@/lib/telegram/signalDispatcher";
import { logInfo } from "@/lib/utils/logger";

const LOG_SCOPE = "live-dispatch-bridge";

export async function dispatchLiveSignalsToTelegram(
  signals: Signal[],
  modelId: string,
  insights: MatchEngineInsight[],
  options?: {
    matches?: Match[];
    metrics?: LiveMetricRecord[];
  }
): Promise<number> {
  if (signals.length === 0) return 0;

  const batch = await dispatchApprovedLiveSignals({
    signals,
    modelId,
    matches: options?.matches ?? [],
    metrics: options?.metrics ?? [],
    insights,
  });

  logInfo(LOG_SCOPE, "Live signals via auto dispatch controller", {
    total: signals.length,
    dispatched: batch.dispatched,
    blocked: batch.blocked,
    queueSize: signalDispatcher.getQueueStats().pending,
  });

  return batch.dispatched;
}
