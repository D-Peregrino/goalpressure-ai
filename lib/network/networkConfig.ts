function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value.trim() === "") return defaultValue;
  const n = value.trim().toLowerCase();
  return n === "true" || n === "1" || n === "yes";
}

export function getNetworkConfig() {
  return {
    enabled: parseBool(process.env.NETWORK_ENGINE_ENABLED, true),
    sandbox: parseBool(process.env.NETWORK_ENGINE_SANDBOX, true),
    maxSignalsPerFeed: 40,
    consensusWindowHours: 6,
    minObserversForConsensus: 2,
  };
}

export function isNetworkEngineEnabled(): boolean {
  return getNetworkConfig().enabled;
}
