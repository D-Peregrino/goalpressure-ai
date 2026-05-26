function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value.trim() === "") return defaultValue;
  const n = value.trim().toLowerCase();
  return n === "true" || n === "1" || n === "yes";
}

export function getPersistenceConfig() {
  return {
    enabled: parseBool(process.env.HISTORICAL_PERSISTENCE_ENABLED, true),
    sandbox: parseBool(process.env.HISTORICAL_PERSISTENCE_SANDBOX, false),
    cycleMinIntervalMs: 45_000,
    fixtureMinIntervalMs: 90_000,
    deferredPhaseMs: 1_800,
    batchSize: 40,
    dbStatsIntervalMs: 5 * 60_000,
  };
}

export function isHistoricalPersistenceEnabled(): boolean {
  return getPersistenceConfig().enabled;
}
