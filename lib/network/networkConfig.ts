import { envBool } from "@/lib/env/envBool";

function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value.trim() === "") return defaultValue;
  const n = value.trim().toLowerCase();
  return n === "true" || n === "1" || n === "yes";
}

export function getNetworkConfig() {
  return {
    enabled: envBool("NETWORK_ENGINE_ENABLED", true, true),
    sandbox: envBool("NETWORK_ENGINE_SANDBOX", true, false),
    maxSignalsPerFeed: 40,
    consensusWindowHours: 6,
    minObserversForConsensus: 2,
  };
}

export function isNetworkEngineEnabled(): boolean {
  return getNetworkConfig().enabled;
}
