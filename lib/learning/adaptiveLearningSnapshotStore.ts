import type { AdaptiveLearningSnapshot } from "@/lib/learning/adaptiveLearning.types";

declare global {
  // eslint-disable-next-line no-var
  var __GP_ADAPTIVE_LEARNING__: { snapshot: AdaptiveLearningSnapshot | null } | undefined;
}

export function setAdaptiveLearningSnapshot(snapshot: AdaptiveLearningSnapshot): void {
  if (!globalThis.__GP_ADAPTIVE_LEARNING__) {
    globalThis.__GP_ADAPTIVE_LEARNING__ = { snapshot: null };
  }
  globalThis.__GP_ADAPTIVE_LEARNING__.snapshot = snapshot;
}

export function getAdaptiveLearningSnapshot(): AdaptiveLearningSnapshot | null {
  return globalThis.__GP_ADAPTIVE_LEARNING__?.snapshot ?? null;
}
