import { envBool } from "@/lib/env/envBool";

function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value.trim() === "") return defaultValue;
  const n = value.trim().toLowerCase();
  return n === "true" || n === "1" || n === "yes";
}

export function getOpsCenterConfig() {
  return {
    enabled: envBool("OPS_CENTER_ENABLED", true, true),
    // Dev: sandbox demo. Produção: dados reais salvo opt-in explícito.
    sandbox: envBool("OPS_CENTER_SANDBOX", true, false),
    maxTimeline: 48,
    maxRadar: 12,
  };
}

export function isOpsCenterEnabled(): boolean {
  return getOpsCenterConfig().enabled;
}
