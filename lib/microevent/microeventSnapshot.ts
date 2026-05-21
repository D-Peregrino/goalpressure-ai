/**
 * Snapshot in-memory — /ops e /api/microevent/live.
 */

import type { MicroeventDetectionResult } from "@/types/microevent";

export interface MicroeventOpsSnapshot {
  updatedAt: string | null;
  matchCount: number;
  averageMicroeventScore: number;
  chaosBursts: {
    fixtureId: string;
    matchLabel?: string;
    chaosBurst: number;
    microeventScore: number;
  }[];
  territorialPressure: {
    fixtureId: string;
    matchLabel?: string;
    territorialDominance: number;
  }[];
  attackWaves: {
    fixtureId: string;
    matchLabel?: string;
    attackWaveIntensity: number;
  }[];
  collapseAlerts: {
    fixtureId: string;
    matchLabel?: string;
    collapseProbability: number;
  }[];
  emotionalTilt: {
    fixtureId: string;
    matchLabel?: string;
    emotionalTilt: number;
  }[];
  topTriggerWindows: {
    fixtureId: string;
    matchLabel?: string;
    triggerWindow: string;
    microeventScore: number;
  }[];
  live: MicroeventDetectionResult[];
}

interface GlobalMicroeventSlot {
  snapshot: MicroeventOpsSnapshot | null;
  byFixture: Map<string, MicroeventDetectionResult>;
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_MICROEVENT__: GlobalMicroeventSlot | undefined;
}

function getSlot(): GlobalMicroeventSlot {
  if (!globalThis.__GP_MICROEVENT__) {
    globalThis.__GP_MICROEVENT__ = {
      snapshot: null,
      byFixture: new Map(),
    };
  }
  return globalThis.__GP_MICROEVENT__;
}

export function getMicroeventForFixture(
  fixtureId: string
): MicroeventDetectionResult | null {
  return getSlot().byFixture.get(fixtureId) ?? null;
}

export function getMicroeventOpsSnapshot(): MicroeventOpsSnapshot | null {
  return getSlot().snapshot;
}

export function setMicroeventOpsSnapshot(
  results: MicroeventDetectionResult[]
): MicroeventOpsSnapshot {
  const slot = getSlot();
  slot.byFixture.clear();
  for (const r of results) {
    slot.byFixture.set(r.fixtureId, r);
  }

  const byChaos = [...results].sort((a, b) => b.chaosBurst - a.chaosBurst);
  const byTerritorial = [...results].sort(
    (a, b) => b.territorialDominance - a.territorialDominance
  );
  const byWaves = [...results].sort(
    (a, b) => b.attackWaveIntensity - a.attackWaveIntensity
  );
  const byCollapse = [...results].sort(
    (a, b) => b.collapseProbability - a.collapseProbability
  );
  const byTilt = [...results].sort((a, b) => b.emotionalTilt - a.emotionalTilt);
  const byWindow = [...results].sort((a, b) => {
    const order = { "30s": 0, "60s": 1, "120s": 2, "300s": 3 };
    const wa = order[a.triggerWindow] ?? 4;
    const wb = order[b.triggerWindow] ?? 4;
    if (wa !== wb) return wa - wb;
    return b.microeventScore - a.microeventScore;
  });

  const n = results.length;
  const averageMicroeventScore =
    n > 0
      ? Math.round(
          results.reduce((s, r) => s + r.microeventScore, 0) / n
        )
      : 0;

  const snapshot: MicroeventOpsSnapshot = {
    updatedAt: new Date().toISOString(),
    matchCount: n,
    averageMicroeventScore,
    chaosBursts: byChaos.slice(0, 8).map((r) => ({
      fixtureId: r.fixtureId,
      matchLabel: r.matchLabel,
      chaosBurst: r.chaosBurst,
      microeventScore: r.microeventScore,
    })),
    territorialPressure: byTerritorial.slice(0, 8).map((r) => ({
      fixtureId: r.fixtureId,
      matchLabel: r.matchLabel,
      territorialDominance: r.territorialDominance,
    })),
    attackWaves: byWaves.slice(0, 8).map((r) => ({
      fixtureId: r.fixtureId,
      matchLabel: r.matchLabel,
      attackWaveIntensity: r.attackWaveIntensity,
    })),
    collapseAlerts: byCollapse
      .filter((r) => r.collapseProbability >= 50)
      .slice(0, 8)
      .map((r) => ({
        fixtureId: r.fixtureId,
        matchLabel: r.matchLabel,
        collapseProbability: r.collapseProbability,
      })),
    emotionalTilt: byTilt
      .filter((r) => r.emotionalTilt >= 45)
      .slice(0, 8)
      .map((r) => ({
        fixtureId: r.fixtureId,
        matchLabel: r.matchLabel,
        emotionalTilt: r.emotionalTilt,
      })),
    topTriggerWindows: byWindow.slice(0, 8).map((r) => ({
      fixtureId: r.fixtureId,
      matchLabel: r.matchLabel,
      triggerWindow: r.triggerWindow,
      microeventScore: r.microeventScore,
    })),
    live: results,
  };

  slot.snapshot = snapshot;
  return snapshot;
}
