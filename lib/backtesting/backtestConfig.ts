function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value.trim() === "") return defaultValue;
  const n = value.trim().toLowerCase();
  return n === "true" || n === "1" || n === "yes";
}

export function getBacktestConfig() {
  return {
    enabled: parseBool(process.env.BACKTESTING_ENABLED, true),
    sandbox: parseBool(process.env.BACKTESTING_SANDBOX, false),
    maxSamples: 400,
  };
}

export function isBacktestingEnabled(): boolean {
  return getBacktestConfig().enabled;
}
