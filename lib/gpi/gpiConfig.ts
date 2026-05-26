function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value.trim() === "") return defaultValue;
  const n = value.trim().toLowerCase();
  return n === "true" || n === "1" || n === "yes";
}

export function getGpiConfig() {
  return {
    enabled: parseBool(process.env.GPI_ENGINE_ENABLED, true),
    sandbox: parseBool(process.env.GPI_ENGINE_SANDBOX, false),
    alertThreshold: 85,
    rapidRiseDelta: 12,
    sharpDropDelta: 15,
    alertCooldownMs: 4 * 60_000,
  };
}

export function isGpiEngineEnabled(): boolean {
  return getGpiConfig().enabled;
}
