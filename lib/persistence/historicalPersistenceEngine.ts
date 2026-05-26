import type { Match } from "@/types/domain";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { persistAutonomousAlerts } from "@/lib/persistence/alertPersistence";
import { persistContextualReadings } from "@/lib/persistence/contextualPersistence";
import { persistMatchOutcomes } from "@/lib/persistence/outcomePersistence";
import {
  getPersistenceConfig,
  isHistoricalPersistenceEnabled,
} from "@/lib/persistence/persistenceConfig";
import { logPersistenceEvent } from "@/lib/persistence/persistenceLogger";
import {
  buildSessionPersistenceMetrics,
  getOperationalPersistenceSnapshot,
  recordPersistenceWrite,
  setOperationalPersistenceSnapshot,
} from "@/lib/persistence/persistenceSnapshotStore";
import type { OperationalPersistenceSnapshot } from "@/lib/persistence/persistence.types";
import { pruneThrottleCache } from "@/lib/persistence/persistenceThrottle";
import { persistPredictiveHistory } from "@/lib/persistence/predictivePersistence";
import { persistLiveMatchSnapshots } from "@/lib/persistence/snapshotPersistence";
import { recordPersistenceFailure } from "@/lib/persistence/persistenceRuntimeState";
import { getThrottleCacheSize } from "@/lib/persistence/persistenceThrottle";

let lastCycleAt = 0;
let lastDbStatsAt = 0;
let running = false;
let deferredTimer: ReturnType<typeof setTimeout> | null = null;

const emptyDbCounts = (): OperationalPersistenceSnapshot["dbCounts"] => ({
  liveMatchSnapshots: 0,
  contextualReadings: 0,
  predictiveHistory: 0,
  autonomousAlerts: 0,
  matchOutcomes: 0,
});

async function fetchDbCounts(): Promise<OperationalPersistenceSnapshot["dbCounts"]> {
  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) return emptyDbCounts();

  const tables = [
    "live_match_snapshots",
    "contextual_readings",
    "predictive_history",
    "autonomous_alerts",
    "match_outcomes",
  ] as const;

  const keys = [
    "liveMatchSnapshots",
    "contextualReadings",
    "predictiveHistory",
    "autonomousAlerts",
    "matchOutcomes",
  ] as const;

  const counts = { ...emptyDbCounts() };

  await Promise.all(
    tables.map(async (table, idx) => {
      const { count, error } = await admin
        .from(table)
        .select("*", { count: "exact", head: true });
      if (!error && count != null) {
        counts[keys[idx]!] = count;
      }
    })
  );

  return counts;
}

async function refreshSnapshot(params: {
  lastCycleRows: number;
  note: string | null;
}): Promise<void> {
  const config = getPersistenceConfig();
  const now = Date.now();
  let dbCounts = getOperationalPersistenceSnapshot()?.dbCounts ?? emptyDbCounts();

  if (now - lastDbStatsAt >= config.dbStatsIntervalMs) {
    dbCounts = await fetchDbCounts();
    lastDbStatsAt = now;
  }

  setOperationalPersistenceSnapshot(
    buildSessionPersistenceMetrics(dbCounts, {
      enabled: config.enabled,
      sandboxMode: config.sandbox,
      lastCycleAt: new Date().toISOString(),
      lastCycleRows: params.lastCycleRows,
      note: params.note,
    })
  );
}

async function runPersistenceCycle(matches: Match[]): Promise<void> {
  const config = getPersistenceConfig();
  if (!config.enabled || running) return;

  const now = Date.now();
  if (now - lastCycleAt < config.cycleMinIntervalMs) return;

  running = true;
  lastCycleAt = now;

  try {
    const fixtures = matches
      .filter((m) => m.status === "LIVE" || m.status === "HALFTIME")
      .map((m) => m.externalId ?? m.id.replace(/^sm-/, "") ?? m.id);

    const snapshots = await persistLiveMatchSnapshots(matches);
    const contextual = await persistContextualReadings(matches);
    const outcomes = await persistMatchOutcomes(matches);

    const phase1 = snapshots + contextual + outcomes;
    recordPersistenceWrite({
      snapshots,
      contextual,
      outcomes,
      cycleRows: phase1,
      fixtures,
    });

    await logPersistenceEvent({
      event: "phase1_complete",
      snapshots,
      contextual,
      outcomes,
      sandbox: config.sandbox,
    });

    await refreshSnapshot({
      lastCycleRows: phase1,
      note: config.sandbox
        ? "Modo sandbox — gravação simulada desativada."
        : null,
    });

    pruneThrottleCache();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    recordPersistenceFailure({
      table: "live_engine_cycle",
      message,
      scope: "phase1",
    });
    await logPersistenceEvent({
      event: "cycle_error",
      message,
    });
  } finally {
    running = false;
  }
}

async function runDeferredPhase(matches: Match[]): Promise<void> {
  const config = getPersistenceConfig();
  if (!config.enabled || config.sandbox) return;

  try {
    const predictive = await persistPredictiveHistory();
    const alerts = await persistAutonomousAlerts();
    const outcomes = await persistMatchOutcomes(matches);
    const total = predictive + alerts + outcomes;

    recordPersistenceWrite({
      predictive,
      alerts,
      outcomes,
      cycleRows: total,
    });

    await logPersistenceEvent({
      event: "phase2_complete",
      predictive,
      alerts,
      outcomes,
    });

    await refreshSnapshot({ lastCycleRows: total, note: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    recordPersistenceFailure({
      table: "live_engine_cycle",
      message,
      scope: "phase2",
    });
    await logPersistenceEvent({
      event: "deferred_error",
      message,
    });
  }
}

export function getPersistenceRuntimeStatus() {
  const config = getPersistenceConfig();
  const nextEligible = lastCycleAt + config.cycleMinIntervalMs;
  return {
    cycleInProgress: running,
    deferredQueuePending: deferredTimer != null,
    throttleActive: getThrottleCacheSize() > 0,
    nextCycleEligibleAt:
      lastCycleAt > 0 ? new Date(nextEligible).toISOString() : null,
    lastCycleAtMs: lastCycleAt,
  };
}

/**
 * Agenda persistência histórica sem bloquear o pipeline live.
 */
export function scheduleHistoricalPersistence(matches: Match[]): void {
  if (!isHistoricalPersistenceEnabled()) return;

  void runPersistenceCycle(matches);

  if (deferredTimer) clearTimeout(deferredTimer);
  const config = getPersistenceConfig();
  deferredTimer = setTimeout(() => {
    deferredTimer = null;
    void runDeferredPhase(matches);
  }, config.deferredPhaseMs);
}

export function getHistoricalPersistenceSnapshot(): OperationalPersistenceSnapshot {
  const existing = getOperationalPersistenceSnapshot();
  if (existing) return existing;

  const config = getPersistenceConfig();
  return buildSessionPersistenceMetrics(emptyDbCounts(), {
    enabled: config.enabled,
    sandboxMode: config.sandbox,
    lastCycleAt: null,
    lastCycleRows: 0,
    note: "Aguardando primeiro ciclo de persistência.",
  });
}

export async function warmHistoricalPersistenceSnapshot(): Promise<OperationalPersistenceSnapshot> {
  const config = getPersistenceConfig();
  const existing = getOperationalPersistenceSnapshot();
  const now = Date.now();
  let dbCounts = existing?.dbCounts ?? emptyDbCounts();
  if (now - lastDbStatsAt >= config.dbStatsIntervalMs) {
    dbCounts = await fetchDbCounts();
    lastDbStatsAt = now;
  }
  const snapshot = buildSessionPersistenceMetrics(dbCounts, {
    enabled: config.enabled,
    sandboxMode: config.sandbox,
    lastCycleAt: existing?.lastCycleAt ?? null,
    lastCycleRows: existing?.lastCycleRows ?? 0,
    note: null,
  });
  setOperationalPersistenceSnapshot(snapshot);
  return snapshot;
}
