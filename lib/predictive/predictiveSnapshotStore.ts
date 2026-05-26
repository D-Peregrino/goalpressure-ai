import type { PredictiveEngineSnapshot } from "@/lib/predictive/predictive.types";

declare global {
  // eslint-disable-next-line no-var
  var __GP_PREDICTIVE__: { snapshot: PredictiveEngineSnapshot | null } | undefined;
}

export function setPredictiveSnapshot(snapshot: PredictiveEngineSnapshot): void {
  if (!globalThis.__GP_PREDICTIVE__) {
    globalThis.__GP_PREDICTIVE__ = { snapshot: null };
  }
  globalThis.__GP_PREDICTIVE__.snapshot = snapshot;
}

export function getPredictiveSnapshot(): PredictiveEngineSnapshot | null {
  return globalThis.__GP_PREDICTIVE__?.snapshot ?? null;
}
