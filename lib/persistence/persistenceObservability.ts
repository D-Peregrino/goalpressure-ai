import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { getPersistenceConfig } from "@/lib/persistence/persistenceConfig";
import {
  getHistoricalPersistenceSnapshot,
  getPersistenceRuntimeStatus,
} from "@/lib/persistence/historicalPersistenceEngine";
import type {
  PersistenceHealthResponse,
  PersistenceHealthStatus,
  PersistenceRecentResponse,
  PersistenceRecentRow,
  PersistenceStatsResponse,
  PersistenceTableStatus,
} from "@/lib/persistence/persistenceObservability.types";
import {
  getFailureCountSession,
  getInsertsPerMinute,
  getLastWriteAt,
  getLastWriteByTable,
  getRecentFailures,
} from "@/lib/persistence/persistenceRuntimeState";
import { getThrottleCacheSize } from "@/lib/persistence/persistenceThrottle";
import {
  getOperationalPersistenceSnapshot,
  getSessionPersistenceTotals,
} from "@/lib/persistence/persistenceSnapshotStore";

const TABLE_META = [
  {
    table: "live_match_snapshots",
    label: "Snapshots live",
    key: "liveMatchSnapshots" as const,
  },
  {
    table: "contextual_readings",
    label: "Leituras contextuais",
    key: "contextualReadings" as const,
  },
  {
    table: "predictive_history",
    label: "Histórico preditivo",
    key: "predictiveHistory" as const,
  },
  {
    table: "autonomous_alerts",
    label: "Alertas autônomos",
    key: "autonomousAlerts" as const,
  },
  { table: "match_outcomes", label: "Outcomes finalizados", key: "matchOutcomes" as const },
] as const;

async function queryTableStatus(
  table: string,
  label: string
): Promise<PersistenceTableStatus> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      table,
      label,
      active: false,
      rowCount: 0,
      lastRecordedAt: getLastWriteByTable(table),
      lastFixtureId: null,
    };
  }

  const { count, error: countError } = await admin
    .from(table)
    .select("*", { count: "exact", head: true });

  const { data: latest, error: latestError } = await admin
    .from(table)
    .select("fixture_id, recorded_at, minute")
    .order("recorded_at", { ascending: false })
    .limit(1);

  const row = latest?.[0] as Record<string, unknown> | undefined;

  return {
    table,
    label,
    active: !countError && !latestError,
    rowCount: countError ? 0 : (count ?? 0),
    lastRecordedAt:
      (row?.recorded_at as string) ?? getLastWriteByTable(table) ?? null,
    lastFixtureId: (row?.fixture_id as string) ?? null,
  };
}

function resolveHealthStatus(
  connected: boolean,
  tables: PersistenceTableStatus[],
  failureCount: number
): PersistenceHealthStatus {
  if (!connected) return "unavailable";
  const activeCount = tables.filter((t) => t.active).length;
  if (activeCount === 0) return "unavailable";
  if (activeCount < tables.length || failureCount > 5) return "degraded";
  return "healthy";
}

export async function getPersistenceHealth(): Promise<PersistenceHealthResponse> {
  const config = getPersistenceConfig();
  const runtime = getPersistenceRuntimeStatus();
  const connected = isSupabaseConfigured() && Boolean(getSupabaseAdmin());

  const tables = connected
    ? await Promise.all(TABLE_META.map((m) => queryTableStatus(m.table, m.label)))
    : TABLE_META.map((m) => ({
        table: m.table,
        label: m.label,
        active: false,
        rowCount: 0,
        lastRecordedAt: getLastWriteByTable(m.table),
        lastFixtureId: null,
      }));

  const failures = getRecentFailures();
  const lastWriteAt =
    tables
      .map((t) => t.lastRecordedAt)
      .filter(Boolean)
      .sort()
      .reverse()[0] ??
    getLastWriteAt() ??
    null;

  const status = config.sandbox
    ? "degraded"
    : resolveHealthStatus(connected, tables, failures.length);

  return {
    ok: status !== "unavailable",
    status,
    generatedAt: new Date().toISOString(),
    databaseConnected: connected,
    persistenceEnabled: config.enabled,
    sandboxMode: config.sandbox,
    tables,
    lastWriteAt,
    recentFailureCount: failures.length,
    throttleActive: runtime.throttleActive,
    cycleInProgress: runtime.cycleInProgress,
    deferredQueuePending: runtime.deferredQueuePending,
  };
}

export async function getPersistenceStats(): Promise<PersistenceStatsResponse> {
  const config = getPersistenceConfig();
  const runtime = getPersistenceRuntimeStatus();
  const connected = isSupabaseConfigured() && Boolean(getSupabaseAdmin());
  const session = getSessionPersistenceTotals();
  const snapshot = getOperationalPersistenceSnapshot() ?? getHistoricalPersistenceSnapshot();

  const tables = connected
    ? await Promise.all(TABLE_META.map((m) => queryTableStatus(m.table, m.label)))
    : [];

  const volumeByTable: Record<string, number> = {};
  for (const m of TABLE_META) {
    const found = tables.find((t) => t.table === m.table);
    volumeByTable[m.table] = found?.rowCount ?? snapshot.dbCounts[m.key] ?? 0;
  }

  const dbTotal = Object.values(volumeByTable).reduce((a, b) => a + b, 0);
  const activeTables = tables.filter((t) => t.active && t.rowCount >= 0).length;

  const lastWriteAt =
    tables
      .map((t) => t.lastRecordedAt)
      .filter(Boolean)
      .sort()
      .reverse()[0] ??
    getLastWriteAt() ??
    snapshot.lastCycleAt;

  return {
    ok: connected,
    generatedAt: new Date().toISOString(),
    databaseConnected: connected,
    snapshotsSaved: session.snapshots || snapshot.snapshotsSaved,
    contextualReadings:
      volumeByTable.contextual_readings ?? snapshot.dbCounts.contextualReadings,
    predictiveHistory:
      volumeByTable.predictive_history ?? snapshot.dbCounts.predictiveHistory,
    autonomousAlerts:
      volumeByTable.autonomous_alerts ?? snapshot.dbCounts.autonomousAlerts,
    matchOutcomes: volumeByTable.match_outcomes ?? snapshot.dbCounts.matchOutcomes,
    volumeByTable,
    fixturesMonitored: snapshot.fixturesMonitored,
    historicalVolumeSession: snapshot.historicalVolume,
    historicalVolumeDatabase: dbTotal,
    insertsPerMinute: getInsertsPerMinute() || snapshot.writeRatePerMinute,
    lastWriteAt,
    lastCycleAt: snapshot.lastCycleAt,
    lastCycleRows: snapshot.lastCycleRows,
    throttle: {
      cycleMinIntervalMs: config.cycleMinIntervalMs,
      fixtureMinIntervalMs: config.fixtureMinIntervalMs,
      cacheEntries: getThrottleCacheSize(),
      nextCycleEligibleAt: runtime.nextCycleEligibleAt,
    },
    queue: {
      cycleInProgress: runtime.cycleInProgress,
      deferredPending: runtime.deferredQueuePending,
    },
    failures: getRecentFailures(),
    failureCountSession: getFailureCountSession(),
    activeTables: connected ? activeTables : 0,
  };
}

function mapRecentRow(
  table: string,
  label: string,
  row: Record<string, unknown>
): PersistenceRecentRow {
  const minute =
    typeof row.minute === "number" ? row.minute : null;
  let summary = label;
  if (table === "contextual_readings") {
    summary = `${row.context_level ?? "—"} · score ${row.context_score ?? 0}`;
  } else if (table === "predictive_history") {
    summary = `${row.predictive_level ?? "—"} · break ${row.break_probability ?? 0}%`;
  } else if (table === "autonomous_alerts") {
    summary = `${row.alert_kind ?? "—"} · ${row.priority ?? "—"}`;
  } else if (table === "live_match_snapshots") {
    summary = `Pressão ${row.pressure_score ?? 0}`;
  } else if (table === "match_outcomes") {
    summary = `Placar ${row.final_score ?? "—"}`;
  }

  return {
    table,
    tableLabel: label,
    fixtureId: String(row.fixture_id ?? "—"),
    minute,
    summary: String(summary).slice(0, 120),
    recordedAt: String(row.recorded_at ?? new Date().toISOString()),
  };
}

export async function getPersistenceRecent(limit = 20): Promise<PersistenceRecentResponse> {
  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) {
    return { ok: false, generatedAt: new Date().toISOString(), items: [] };
  }

  const perTable = Math.max(2, Math.ceil(limit / TABLE_META.length));
  const items: PersistenceRecentRow[] = [];

  await Promise.all(
    TABLE_META.map(async (meta) => {
      const { data, error } = await admin
        .from(meta.table)
        .select("*")
        .order("recorded_at", { ascending: false })
        .limit(perTable);

      if (error || !data) return;
      for (const row of data) {
        items.push(
          mapRecentRow(meta.table, meta.label, row as Record<string, unknown>)
        );
      }
    })
  );

  items.sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  );

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    items: items.slice(0, limit),
  };
}
