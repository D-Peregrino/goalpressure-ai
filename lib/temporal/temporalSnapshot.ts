/**
 * Snapshot in-memory — /ops e /api/temporal/live.
 */

import type { TemporalDynamicsResult } from "@/types/temporal";
import type { ExecutionPriority } from "@/types/temporal";

export interface TemporalChaosMapEntry {
  fixtureId: string;
  matchLabel?: string;
  minute: number;
  chaosIndex: number;
  executionPriority: ExecutionPriority;
  matchPhase: string;
}

export interface TemporalOpsSnapshot {
  updatedAt: string | null;
  matchCount: number;
  averageChaos: number;
  averageAcceleration: number;
  averageUrgency: number;
  averageVolatility: number;
  criticalCount: number;
  highPriorityCount: number;
  topChaos: TemporalDynamicsResult | null;
  chaosMap: TemporalChaosMapEntry[];
  byPriority: Record<string, number>;
  live: TemporalDynamicsResult[];
}

interface GlobalTemporalSlot {
  snapshot: TemporalOpsSnapshot | null;
  byFixture: Map<string, TemporalDynamicsResult>;
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_TEMPORAL__: GlobalTemporalSlot | undefined;
}

function getSlot(): GlobalTemporalSlot {
  if (!globalThis.__GP_TEMPORAL__) {
    globalThis.__GP_TEMPORAL__ = {
      snapshot: null,
      byFixture: new Map(),
    };
  }
  return globalThis.__GP_TEMPORAL__;
}

export function getTemporalDynamicsForFixture(
  fixtureId: string
): TemporalDynamicsResult | null {
  return getSlot().byFixture.get(fixtureId) ?? null;
}

export function getTemporalOpsSnapshot(): TemporalOpsSnapshot | null {
  return getSlot().snapshot;
}

export function setTemporalOpsSnapshot(
  results: TemporalDynamicsResult[]
): TemporalOpsSnapshot {
  const slot = getSlot();
  slot.byFixture.clear();
  for (const r of results) {
    slot.byFixture.set(r.fixtureId, r);
  }

  const sorted = [...results].sort((a, b) => b.chaosIndex - a.chaosIndex);
  const n = results.length || 1;

  const byPriority: Record<string, number> = {};
  for (const r of results) {
    byPriority[r.executionPriority] = (byPriority[r.executionPriority] ?? 0) + 1;
  }

  const snapshot: TemporalOpsSnapshot = {
    updatedAt: new Date().toISOString(),
    matchCount: results.length,
    averageChaos: Math.round(
      results.reduce((s, r) => s + r.chaosIndex, 0) / n
    ),
    averageAcceleration: Math.round(
      results.reduce((s, r) => s + r.accelerationScore, 0) / n
    ),
    averageUrgency: Math.round(
      (results.reduce((s, r) => s + r.urgencyMultiplier, 0) / n) * 100
    ) / 100,
    averageVolatility: Math.round(
      results.reduce((s, r) => s + r.volatilityScore, 0) / n
    ),
    criticalCount: results.filter((r) => r.executionPriority === "CRITICAL").length,
    highPriorityCount: results.filter((r) => r.executionPriority === "HIGH").length,
    topChaos: sorted[0] ?? null,
    chaosMap: sorted.slice(0, 16).map((r) => ({
      fixtureId: r.fixtureId,
      matchLabel: r.matchLabel,
      minute: r.minute,
      chaosIndex: r.chaosIndex,
      executionPriority: r.executionPriority,
      matchPhase: r.matchPhase,
    })),
    byPriority,
    live: sorted,
  };

  slot.snapshot = snapshot;
  return snapshot;
}
