/**
 * Snapshot in-memory — /ops e /api/data-quality/live.
 */

import type { DataQualityResult } from "@/types/dataQuality";

export interface DataQualityOpsSnapshot {
  updatedAt: string | null;
  matchCount: number;
  averageScore: number;
  unreliableCount: number;
  staleAlerts: { fixtureId: string; matchLabel?: string; staleRisk: number }[];
  notUsableForSignal: { fixtureId: string; matchLabel?: string; score: number }[];
  live: DataQualityResult[];
}

interface GlobalDataQualitySlot {
  snapshot: DataQualityOpsSnapshot | null;
  byFixture: Map<string, DataQualityResult>;
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_DATA_QUALITY__: GlobalDataQualitySlot | undefined;
}

function getSlot(): GlobalDataQualitySlot {
  if (!globalThis.__GP_DATA_QUALITY__) {
    globalThis.__GP_DATA_QUALITY__ = {
      snapshot: null,
      byFixture: new Map(),
    };
  }
  return globalThis.__GP_DATA_QUALITY__;
}

export function getDataQualityForFixture(
  fixtureId: string
): DataQualityResult | null {
  return getSlot().byFixture.get(fixtureId) ?? null;
}

export function getDataQualityOpsSnapshot(): DataQualityOpsSnapshot | null {
  return getSlot().snapshot;
}

export function setDataQualityOpsSnapshot(
  results: DataQualityResult[]
): DataQualityOpsSnapshot {
  const slot = getSlot();
  slot.byFixture.clear();
  for (const r of results) {
    slot.byFixture.set(r.fixtureId, r);
  }

  const n = results.length;
  const snapshot: DataQualityOpsSnapshot = {
    updatedAt: new Date().toISOString(),
    matchCount: n,
    averageScore:
      n > 0
        ? Math.round(results.reduce((s, r) => s + r.dataQualityScore, 0) / n)
        : 0,
    unreliableCount: results.filter((r) => r.reliability === "LOW").length,
    staleAlerts: [...results]
      .filter((r) => r.staleRisk >= 50)
      .sort((a, b) => b.staleRisk - a.staleRisk)
      .slice(0, 8)
      .map((r) => ({
        fixtureId: r.fixtureId,
        matchLabel: r.matchLabel,
        staleRisk: r.staleRisk,
      })),
    notUsableForSignal: results
      .filter((r) => !r.usableForSignal)
      .slice(0, 8)
      .map((r) => ({
        fixtureId: r.fixtureId,
        matchLabel: r.matchLabel,
        score: r.dataQualityScore,
      })),
    live: results,
  };

  slot.snapshot = snapshot;
  return snapshot;
}
