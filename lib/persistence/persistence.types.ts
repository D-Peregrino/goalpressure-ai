export interface OperationalPersistenceSnapshot {
  generatedAt: string;
  enabled: boolean;
  sandboxMode: boolean;
  snapshotsSaved: number;
  fixturesMonitored: number;
  historicalVolume: number;
  writeRatePerMinute: number;
  contextualDbSharePct: number;
  lastCycleAt: string | null;
  lastCycleRows: number;
  dbCounts: {
    liveMatchSnapshots: number;
    contextualReadings: number;
    predictiveHistory: number;
    autonomousAlerts: number;
    matchOutcomes: number;
  };
  recentFixtures: string[];
  note: string | null;
}
