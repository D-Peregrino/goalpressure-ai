import type { GPIAlertEvent, GPIEngineSnapshot } from "@/lib/gpi/gpi.types";

declare global {
  // eslint-disable-next-line no-var
  var __GP_GPI_ENGINE__: {
    snapshot: GPIEngineSnapshot | null;
    recentAlerts: GPIAlertEvent[];
  } | undefined;
}

function slot() {
  if (!globalThis.__GP_GPI_ENGINE__) {
    globalThis.__GP_GPI_ENGINE__ = { snapshot: null, recentAlerts: [] };
  }
  return globalThis.__GP_GPI_ENGINE__;
}

export function setGpiSnapshot(snapshot: GPIEngineSnapshot): void {
  slot().snapshot = snapshot;
}

export function getGpiSnapshot(): GPIEngineSnapshot | null {
  return slot().snapshot ?? null;
}

export function pushGpiAlert(event: GPIAlertEvent): void {
  const s = slot();
  s.recentAlerts.unshift(event);
  if (s.recentAlerts.length > 24) s.recentAlerts.length = 24;
}

export function getGpiRecentAlerts(): GPIAlertEvent[] {
  return [...(slot().recentAlerts ?? [])];
}
