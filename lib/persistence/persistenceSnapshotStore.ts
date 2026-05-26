import type { OperationalPersistenceSnapshot } from "@/lib/persistence/persistence.types";

declare global {
  // eslint-disable-next-line no-var
  var __GP_HISTORICAL_PERSISTENCE__: {
    snapshot: OperationalPersistenceSnapshot | null;
  } | undefined;
}

const sessionTotals = {
  snapshots: 0,
  contextual: 0,
  predictive: 0,
  alerts: 0,
  outcomes: 0,
  cycleRows: 0,
};

const writeTimestamps: number[] = [];
const monitoredFixtures = new Set<string>();

export function recordPersistenceWrite(
  counts: Partial<typeof sessionTotals> & { fixtures?: string[] }
): void {
  if (counts.snapshots) sessionTotals.snapshots += counts.snapshots;
  if (counts.contextual) sessionTotals.contextual += counts.contextual;
  if (counts.predictive) sessionTotals.predictive += counts.predictive;
  if (counts.alerts) sessionTotals.alerts += counts.alerts;
  if (counts.outcomes) sessionTotals.outcomes += counts.outcomes;
  if (counts.cycleRows) sessionTotals.cycleRows += counts.cycleRows;

  const total =
    (counts.snapshots ?? 0) +
    (counts.contextual ?? 0) +
    (counts.predictive ?? 0) +
    (counts.alerts ?? 0) +
    (counts.outcomes ?? 0);
  if (total > 0) writeTimestamps.push(Date.now());

  if (counts.fixtures) {
    for (const f of counts.fixtures) monitoredFixtures.add(f);
  }

  const cutoff = Date.now() - 5 * 60_000;
  while (writeTimestamps.length > 0 && writeTimestamps[0]! < cutoff) {
    writeTimestamps.shift();
  }
}

function writeRatePerMinute(): number {
  const windowMs = 5 * 60_000;
  const recent = writeTimestamps.filter((t) => Date.now() - t < windowMs);
  return Math.round((recent.length / 5) * 10) / 10;
}

export function setOperationalPersistenceSnapshot(
  snapshot: OperationalPersistenceSnapshot
): void {
  if (!globalThis.__GP_HISTORICAL_PERSISTENCE__) {
    globalThis.__GP_HISTORICAL_PERSISTENCE__ = { snapshot: null };
  }
  globalThis.__GP_HISTORICAL_PERSISTENCE__.snapshot = snapshot;
}

export function getOperationalPersistenceSnapshot(): OperationalPersistenceSnapshot | null {
  return globalThis.__GP_HISTORICAL_PERSISTENCE__?.snapshot ?? null;
}

export function getSessionPersistenceTotals() {
  return { ...sessionTotals };
}

export function buildSessionPersistenceMetrics(
  dbCounts: OperationalPersistenceSnapshot["dbCounts"],
  params: {
    enabled: boolean;
    sandboxMode: boolean;
    lastCycleAt: string | null;
    lastCycleRows: number;
    note: string | null;
  }
): OperationalPersistenceSnapshot {
  const historicalVolume =
    sessionTotals.snapshots +
    sessionTotals.contextual +
    sessionTotals.predictive +
    sessionTotals.alerts +
    sessionTotals.outcomes;

  const dbTotal =
    dbCounts.liveMatchSnapshots +
    dbCounts.contextualReadings +
    dbCounts.predictiveHistory +
    dbCounts.autonomousAlerts +
    dbCounts.matchOutcomes;

  const contextualDbSharePct =
    dbTotal > 0
      ? Math.round((dbCounts.contextualReadings / dbTotal) * 1000) / 10
      : 0;

  return {
    generatedAt: new Date().toISOString(),
    enabled: params.enabled,
    sandboxMode: params.sandboxMode,
    snapshotsSaved: sessionTotals.snapshots,
    fixturesMonitored: monitoredFixtures.size,
    historicalVolume,
    writeRatePerMinute: writeRatePerMinute(),
    contextualDbSharePct,
    lastCycleAt: params.lastCycleAt,
    lastCycleRows: params.lastCycleRows,
    dbCounts,
    recentFixtures: [...monitoredFixtures].slice(-8),
    note: params.note,
  };
}
