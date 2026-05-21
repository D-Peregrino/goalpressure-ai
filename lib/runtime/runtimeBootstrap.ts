/**
 * Server-side runtime bootstrap — auto-starts live polling in production.
 */

import { ensureProductionRuntimeStarted } from "@/lib/live/livePollingEngine";

let bootstrapped = false;

export function bootstrapGoalPressureRuntime(): void {
  if (bootstrapped) return;
  if (typeof window !== "undefined") return;

  bootstrapped = true;
  ensureProductionRuntimeStarted();
}
