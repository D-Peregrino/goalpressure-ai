import type { Match, Signal } from "@/types/domain";
import type { LiveEngineProcessResult, LiveEngineSnapshot } from "@/types/engine";
import { generateLiveSignals } from "@/lib/engine/signals/liveSignalGenerator";
import { runLivePressureWorker } from "@/lib/workers/livePressureWorker";
import {
  getLiveEngineSnapshot,
  pruneEngineMemory,
  setLiveEngineSnapshot,
} from "@/lib/engine/engineSnapshotStore";
import { runExecutionDispatcher } from "@/lib/execution/signalDispatcher";
import { buildAutonomousSnapshotFromMatches } from "@/lib/autonomous/runAutonomousDecision";
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
  dispatchTelegram?: boolean;
  modelId?: string;
}

/**
 * Pipeline live: worker de pressão → sinais → snapshot (async por persistência Supabase).
 */
export async function processLiveEngineBatch(
  matches: Match[],
  options: ProcessLiveEngineOptions = {}
): Promise<LiveEngineProcessResult> {
  maybePruneMemory();

  const workerResult = await runLivePressureWorker(matches);
  const autonomousSnapshot = buildAutonomousSnapshotFromMatches(workerResult.matches);
  const { signals: extraSignals, insights, enrichedMatches } =
    generateLiveSignals(workerResult.matches);

  const signalByMatch = new Map<string, Signal>();
  for (const s of workerResult.signals) signalByMatch.set(s.matchId, s);
  for (const s of extraSignals) {
    if (!signalByMatch.has(s.matchId)) signalByMatch.set(s.matchId, s);
  }
  const signals = [...signalByMatch.values()];

  let snapshot = buildSnapshot(enrichedMatches, signals, insights);

  const dispatchResult = await runExecutionDispatcher({
    matches: enrichedMatches,
    signals,
    enableTelegram: options.dispatchTelegram !== false,
    enablePush: true,
  });

  snapshot = {
    ...snapshot,
    queueSize: dispatchResult.snapshot.queueSize,
    dispatch: dispatchResult.snapshot,
    autonomous: autonomousSnapshot,
  };

  setLiveEngineSnapshot(snapshot);

  logInfo(LOG_SCOPE, "Live engine batch processed", {
    matches: enrichedMatches.length,
    signals: signals.length,
    snapshots: workerResult.snapshotsPersisted,
    strongestPressure: snapshot.strongestPressure?.pressure.score ?? 0,
  });

  return { matches: enrichedMatches, signals, snapshot };
}

export function getLatestEngineSnapshot(): LiveEngineSnapshot | null {
  return getLiveEngineSnapshot();
}
