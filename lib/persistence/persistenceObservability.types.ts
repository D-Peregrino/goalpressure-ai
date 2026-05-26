export type PersistenceHealthStatus = "healthy" | "degraded" | "unavailable";

export interface PersistenceTableStatus {
  table: string;
  label: string;
  active: boolean;
  rowCount: number;
  lastRecordedAt: string | null;
  lastFixtureId: string | null;
}

export interface PersistenceFailureRecord {
  at: string;
  table: string;
  message: string;
  scope: string;
}

export interface PersistenceHealthResponse {
  ok: boolean;
  status: PersistenceHealthStatus;
  generatedAt: string;
  databaseConnected: boolean;
  persistenceEnabled: boolean;
  sandboxMode: boolean;
  tables: PersistenceTableStatus[];
  lastWriteAt: string | null;
  recentFailureCount: number;
  throttleActive: boolean;
  cycleInProgress: boolean;
  deferredQueuePending: boolean;
}

export interface PersistenceStatsResponse {
  ok: boolean;
  generatedAt: string;
  databaseConnected: boolean;
  snapshotsSaved: number;
  contextualReadings: number;
  predictiveHistory: number;
  autonomousAlerts: number;
  matchOutcomes: number;
  volumeByTable: Record<string, number>;
  fixturesMonitored: number;
  historicalVolumeSession: number;
  historicalVolumeDatabase: number;
  insertsPerMinute: number;
  lastWriteAt: string | null;
  lastCycleAt: string | null;
  lastCycleRows: number;
  throttle: {
    cycleMinIntervalMs: number;
    fixtureMinIntervalMs: number;
    cacheEntries: number;
    nextCycleEligibleAt: string | null;
  };
  queue: {
    cycleInProgress: boolean;
    deferredPending: boolean;
  };
  failures: PersistenceFailureRecord[];
  failureCountSession: number;
  activeTables: number;
}

export interface PersistenceRecentRow {
  table: string;
  tableLabel: string;
  fixtureId: string;
  minute: number | null;
  summary: string;
  recordedAt: string;
}

export interface PersistenceRecentResponse {
  ok: boolean;
  generatedAt: string;
  items: PersistenceRecentRow[];
}
