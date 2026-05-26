function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value.trim() === "") return defaultValue;
  const n = value.trim().toLowerCase();
  return n === "true" || n === "1" || n === "yes";
}

export function getPredictiveEngineConfig() {
  return {
    enabled: parseBool(process.env.PREDICTIVE_ENGINE_ENABLED, true),
    sandbox: parseBool(process.env.PREDICTIVE_ENGINE_SANDBOX, false),
  };
}

export function isPredictiveEngineEnabled(): boolean {
  return getPredictiveEngineConfig().enabled;
}
