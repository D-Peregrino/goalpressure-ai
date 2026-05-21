import type { LiveEngineSnapshot } from "@/types/engine";
import { pruneAntiSpamState } from "@/lib/engine/signals/signalAntiSpam";
import { pruneStaleTicks } from "@/lib/engine/pressure/rollingWindow";

interface GlobalEngineSlot {
  snapshot: LiveEngineSnapshot | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_ENGINE__: GlobalEngineSlot | undefined;
}

function getSlot(): GlobalEngineSlot {
  if (!globalThis.__GP_ENGINE__) {
    globalThis.__GP_ENGINE__ = { snapshot: null };
  }
  return globalThis.__GP_ENGINE__;
}

export function setLiveEngineSnapshot(snapshot: LiveEngineSnapshot): void {
  getSlot().snapshot = snapshot;
}

export function getLiveEngineSnapshot(): LiveEngineSnapshot | null {
  return getSlot().snapshot;
}

export function pruneEngineMemory(): void {
  pruneStaleTicks();
  pruneAntiSpamState();
}
