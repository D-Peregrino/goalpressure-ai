import type { AutonomousAlertSnapshot } from "@/lib/autonomous/autonomousAlert.types";

interface Slot {
  snapshot: AutonomousAlertSnapshot | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_AUTONOMOUS_ALERTS__: Slot | undefined;
}

export function setAutonomousAlertSnapshot(snapshot: AutonomousAlertSnapshot): void {
  if (!globalThis.__GP_AUTONOMOUS_ALERTS__) {
    globalThis.__GP_AUTONOMOUS_ALERTS__ = { snapshot: null };
  }
  globalThis.__GP_AUTONOMOUS_ALERTS__.snapshot = snapshot;
}

export function getAutonomousAlertSnapshot(): AutonomousAlertSnapshot | null {
  return globalThis.__GP_AUTONOMOUS_ALERTS__?.snapshot ?? null;
}
