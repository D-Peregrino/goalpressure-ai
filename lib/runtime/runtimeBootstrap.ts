/**
 * Server-side runtime bootstrap — auto-starts live polling (15s) unless disabled.
 */

import { ensureProductionRuntimeStarted } from "@/lib/live/livePollingEngine";

let bootstrapped = false;

export function bootstrapGoalPressureRuntime(): void {
  if (bootstrapped) return;
  if (typeof window !== "undefined") return;

  bootstrapped = true;
  ensureProductionRuntimeStarted();
}
