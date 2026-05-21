/**
 * Snapshot in-memory — /ops e /api/sequence/live.
 */

import type { SequenceMemoryResult } from "@/types/sequence";

export interface SequenceOpsSnapshot {
  updatedAt: string | null;
  matchCount: number;
  averageRecurrenceScore: number;
  recurrenceLeaders: {
    fixtureId: string;
    matchLabel?: string;
    recurrenceScore: number;
    sequenceState: string;
  }[];
  offensiveCycles: {
    fixtureId: string;
    matchLabel?: string;
    offensiveCycleStrength: number;
  }[];
  fakeMomentumAlerts: {
    fixtureId: string;
    matchLabel?: string;
    fakeMomentumProbability: number;
  }[];
  collapseCycles: {
    fixtureId: string;
    matchLabel?: string;
    collapseCycleProbability: number;
  }[];
  dominanceCurves: {
    fixtureId: string;
    matchLabel?: string;
    lateGameDominance: number;
  }[];
  sustainedChaos: {
    fixtureId: string;
    matchLabel?: string;
    sustainedChaosLevel: number;
    sequenceState: string;
  }[];
  live: SequenceMemoryResult[];
}

interface GlobalSequenceSlot {
  snapshot: SequenceOpsSnapshot | null;
  byFixture: Map<string, SequenceMemoryResult>;
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_SEQUENCE_MEMORY__: GlobalSequenceSlot | undefined;
}

function getSlot(): GlobalSequenceSlot {
  if (!globalThis.__GP_SEQUENCE_MEMORY__) {
    globalThis.__GP_SEQUENCE_MEMORY__ = {
      snapshot: null,
      byFixture: new Map(),
    };
  }
  return globalThis.__GP_SEQUENCE_MEMORY__;
}

export function getSequenceMemoryForFixture(
  fixtureId: string
): SequenceMemoryResult | null {
  return getSlot().byFixture.get(fixtureId) ?? null;
}

export function getSequenceOpsSnapshot(): SequenceOpsSnapshot | null {
  return getSlot().snapshot;
}

export function setSequenceOpsSnapshot(
  results: SequenceMemoryResult[]
): SequenceOpsSnapshot {
  const slot = getSlot();
  slot.byFixture.clear();
  for (const r of results) {
    slot.byFixture.set(r.fixtureId, r);
  }

  const byRecurrence = [...results].sort(
    (a, b) => b.recurrenceScore - a.recurrenceScore
  );
  const byOffensive = [...results].sort(
    (a, b) => b.offensiveCycleStrength - a.offensiveCycleStrength
  );
  const byFake = [...results].sort(
    (a, b) => b.fakeMomentumProbability - a.fakeMomentumProbability
  );
  const byCollapse = [...results].sort(
    (a, b) => b.collapseCycleProbability - a.collapseCycleProbability
  );
  const byDominance = [...results].sort(
    (a, b) => b.lateGameDominance - a.lateGameDominance
  );
  const byChaos = [...results].sort(
    (a, b) => b.sustainedChaosLevel - a.sustainedChaosLevel
  );

  const n = results.length;
  const averageRecurrenceScore =
    n > 0
      ? Math.round(
          results.reduce((s, r) => s + r.recurrenceScore, 0) / n
        )
      : 0;

  const snapshot: SequenceOpsSnapshot = {
    updatedAt: new Date().toISOString(),
    matchCount: n,
    averageRecurrenceScore,
    recurrenceLeaders: byRecurrence.slice(0, 8).map((r) => ({
      fixtureId: r.fixtureId,
      matchLabel: r.matchLabel,
      recurrenceScore: r.recurrenceScore,
      sequenceState: r.sequenceState,
    })),
    offensiveCycles: byOffensive.slice(0, 8).map((r) => ({
      fixtureId: r.fixtureId,
      matchLabel: r.matchLabel,
      offensiveCycleStrength: r.offensiveCycleStrength,
    })),
    fakeMomentumAlerts: byFake
      .filter((r) => r.fakeMomentumProbability >= 50)
      .slice(0, 8)
      .map((r) => ({
        fixtureId: r.fixtureId,
        matchLabel: r.matchLabel,
        fakeMomentumProbability: r.fakeMomentumProbability,
      })),
    collapseCycles: byCollapse
      .filter((r) => r.collapseCycleProbability >= 50)
      .slice(0, 8)
      .map((r) => ({
        fixtureId: r.fixtureId,
        matchLabel: r.matchLabel,
        collapseCycleProbability: r.collapseCycleProbability,
      })),
    dominanceCurves: byDominance.slice(0, 8).map((r) => ({
      fixtureId: r.fixtureId,
      matchLabel: r.matchLabel,
      lateGameDominance: r.lateGameDominance,
    })),
    sustainedChaos: byChaos.slice(0, 8).map((r) => ({
      fixtureId: r.fixtureId,
      matchLabel: r.matchLabel,
      sustainedChaosLevel: r.sustainedChaosLevel,
      sequenceState: r.sequenceState,
    })),
    live: results,
  };

  slot.snapshot = snapshot;
  return snapshot;
}
