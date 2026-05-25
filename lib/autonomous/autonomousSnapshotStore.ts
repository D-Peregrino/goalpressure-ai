import type { AutonomousCoreSnapshot } from "@/lib/autonomous/autonomous.types";

interface AutonomousSlot {
  snapshot: AutonomousCoreSnapshot | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_AUTONOMOUS__: AutonomousSlot | undefined;
}

export function setAutonomousCoreSnapshot(snapshot: AutonomousCoreSnapshot): void {
  if (!globalThis.__GP_AUTONOMOUS__) {
    globalThis.__GP_AUTONOMOUS__ = { snapshot: null };
  }
  globalThis.__GP_AUTONOMOUS__.snapshot = snapshot;
}

export function getAutonomousCoreSnapshot(): AutonomousCoreSnapshot | null {
  return globalThis.__GP_AUTONOMOUS__?.snapshot ?? null;
}
