import type { Match, Signal } from "@/types/domain";
import type { LiveEngineProcessResult, LiveEngineSnapshot } from "@/types/engine";
import { generateLiveSignals } from "@/lib/engine/signals/liveSignalGenerator";
import {
  getLiveEngineSnapshot,
  pruneEngineMemory,
  setLiveEngineSnapshot,
} from "@/lib/engine/engineSnapshotStore";
import { dispatchLiveSignalsToTelegram } from "@/lib/engine/telegram/liveDispatchBridge";
import { getActiveModelId } from "@/lib/signalEngine";
import { logInfo } from "@/lib/utils/logger";

const LOG_SCOPE = "live-engine-pipeline";

let lastPruneAt = 0;
const PRUNE_INTERVAL_MS = 5 * 60_000;

function maybePruneMemory(): void {
  const now = Date.now();
  if (now - lastPruneAt < PRUNE_INTERVAL_MS) return;
  lastPruneAt = now;
  pruneEngineMemory();
}

function buildSnapshot(
  matches: Match[],
  signals: Signal[],
  insights: LiveEngineProcessResult["snapshot"]["insights"]
): LiveEngineSnapshot {
  const sortedByPressure = [...insights].sort(
    (a, b) => b.pressure.score - a.pressure.score
  );
  const sortedByMomentum = [...insights].sort(
    (a, b) => b.momentum.momentumScore - a.momentum.momentumScore
  );

  return {
    updatedAt: new Date().toISOString(),
    matchCount: matches.length,
    activeSignals: signals.length,
    strongestPressure: sortedByPressure[0] ?? null,
    highestMomentum: sortedByMomentum[0] ?? null,
    insights,
    signals,
    queueSize: 0,
  };
}

export interface ProcessLiveEngineOptions {
  /** Dispatch signals to Telegram (real when TELEGRAM_SANDBOX_MODE=false) */
  dispatchTelegram?: boolean;
  modelId?: string;
}

/**
 * Full live quantitative pipeline: pressure → momentum → EV → signals → snapshot.
 */
export function processLiveEngineBatch(
  matches: Match[],
  options: ProcessLiveEngineOptions = {}
): LiveEngineProcessResult {
  maybePruneMemory();

  const { signals, insights, enrichedMatches } = generateLiveSignals(matches);

  let snapshot = buildSnapshot(enrichedMatches, signals, insights);

  if (options.dispatchTelegram !== false && signals.length > 0) {
    const modelId = options.modelId ?? getActiveModelId();
    const queueSize = dispatchLiveSignalsToTelegram(signals, modelId, insights);
    snapshot = { ...snapshot, queueSize };
  }

  setLiveEngineSnapshot(snapshot);

  logInfo(LOG_SCOPE, "Live engine batch processed", {
    matches: enrichedMatches.length,
    signals: signals.length,
    strongestPressure: snapshot.strongestPressure?.pressure.score ?? 0,
  });

  return { matches: enrichedMatches, signals, snapshot };
}

export function getLatestEngineSnapshot(): LiveEngineSnapshot | null {
  return getLiveEngineSnapshot();
}
