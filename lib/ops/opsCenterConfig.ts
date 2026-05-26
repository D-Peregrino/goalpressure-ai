function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value.trim() === "") return defaultValue;
  const n = value.trim().toLowerCase();
  return n === "true" || n === "1" || n === "yes";
}

export function getOpsCenterConfig() {
  return {
    enabled: parseBool(process.env.OPS_CENTER_ENABLED, true),
    sandbox: parseBool(process.env.OPS_CENTER_SANDBOX, true),
    maxTimeline: 48,
    maxRadar: 12,
  };
}

export function isOpsCenterEnabled(): boolean {
  return getOpsCenterConfig().enabled;
}
