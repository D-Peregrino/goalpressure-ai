import type { LearningDashboardSnapshot } from "@/lib/engine/learning/learning.types";

interface LearningSlot {
  snapshot: LearningDashboardSnapshot | null;
  lastRefreshMs: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_LEARNING__: LearningSlot | undefined;
}

const CACHE_TTL_MS = 120_000;

function getSlot(): LearningSlot {
  if (!globalThis.__GP_LEARNING__) {
    globalThis.__GP_LEARNING__ = { snapshot: null, lastRefreshMs: 0 };
  }
  return globalThis.__GP_LEARNING__;
}

export function setLearningSnapshot(snapshot: LearningDashboardSnapshot): void {
  const slot = getSlot();
  slot.snapshot = snapshot;
  slot.lastRefreshMs = Date.now();
}

export function getLearningSnapshot(): LearningDashboardSnapshot | null {
  const slot = getSlot();
  if (!slot.snapshot) return null;
  if (Date.now() - slot.lastRefreshMs > CACHE_TTL_MS) return slot.snapshot;
  return slot.snapshot;
}

export function isLearningCacheStale(): boolean {
  const slot = getSlot();
  return Date.now() - slot.lastRefreshMs > CACHE_TTL_MS;
}
