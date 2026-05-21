/**
 * Bridges live engine signals → real Telegram dispatcher.
 */

import type { Signal } from "@/types/domain";
import type { MatchEngineInsight } from "@/types/engine";
import { dispatchSignalsToTelegram } from "@/lib/telegram/signalDispatcher";
import { signalDispatcher } from "@/lib/telegram/signalDispatcher";
import { logInfo } from "@/lib/utils/logger";

const LOG_SCOPE = "live-dispatch-bridge";

export function dispatchLiveSignalsToTelegram(
  signals: Signal[],
  modelId: string,
  insights: MatchEngineInsight[]
): number {
  if (signals.length === 0) return 0;

  const insightByMatch = new Map(insights.map((i) => [i.matchId, i]));

  const minuteByMatchId: Record<string, number> = {};
  const momentumByMatchId: Record<string, string> = {};
  const reasonByMatchId: Record<string, string> = {};

  for (const insight of insights) {
    minuteByMatchId[insight.matchId] = insight.minute;
    const flags = insight.momentum.flags;
    momentumByMatchId[insight.matchId] =
      flags.length > 0
        ? flags[0].replace(/_/g, " ")
        : insight.momentum.pressureGrowth > 2
          ? "RISING"
          : insight.momentum.pressureGrowth < -2
            ? "FALLING"
            : "STABLE";
    reasonByMatchId[insight.matchId] = `Pressure ${insight.pressure.score}/100 · ${insight.pressure.level} · EV O0.5 ${insight.expectedValue.over05.evPercent.toFixed(1)}%`;
  }

  const results = dispatchSignalsToTelegram(signals, "production", modelId, {
    minuteByMatchId,
    momentumByMatchId,
    reasonByMatchId,
  });

  const queued = results.filter((r) => r.queued).length;

  logInfo(LOG_SCOPE, "Live signals dispatched to Telegram pipeline", {
    total: signals.length,
    queued,
    queueSize: signalDispatcher.getQueueStats().pending,
  });

  return signalDispatcher.getQueueStats().pending;
}
