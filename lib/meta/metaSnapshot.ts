/**
 * Snapshot in-memory — /ops e /api/meta/live.
 */

import type { ExecutionDecision, ExecutionGrade, MetaConsensusResult } from "@/types/meta";

export interface MetaConsensusHeatmapEntry {
  fixtureId: string;
  matchLabel?: string;
  consensusScore: number;
  institutionalConfidence: number;
  executionGrade: ExecutionGrade;
  executionDecision: ExecutionDecision;
}

export interface MetaOpsSnapshot {
  updatedAt: string | null;
  matchCount: number;
  averageConsensusScore: number;
  averageInstitutionalConfidence: number;
  executionGrades: {
    grade: ExecutionGrade;
    count: number;
    fixtures: string[];
  }[];
  consensusHeatmap: MetaConsensusHeatmapEntry[];
  falsePositiveAlerts: {
    fixtureId: string;
    matchLabel?: string;
    falsePositiveRisk: number;
    executionDecision: ExecutionDecision;
  }[];
  dominantEnginesSummary: { engine: string; weight: number }[];
  topExecutions: {
    fixtureId: string;
    matchLabel?: string;
    executionDecision: ExecutionDecision;
    executionGrade: ExecutionGrade;
    consensusScore: number;
  }[];
  live: MetaConsensusResult[];
}

interface GlobalMetaSlot {
  snapshot: MetaOpsSnapshot | null;
  byFixture: Map<string, MetaConsensusResult>;
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_META_CONSENSUS__: GlobalMetaSlot | undefined;
}

function getSlot(): GlobalMetaSlot {
  if (!globalThis.__GP_META_CONSENSUS__) {
    globalThis.__GP_META_CONSENSUS__ = {
      snapshot: null,
      byFixture: new Map(),
    };
  }
  return globalThis.__GP_META_CONSENSUS__;
}

export function getMetaConsensusForFixture(
  fixtureId: string
): MetaConsensusResult | null {
  return getSlot().byFixture.get(fixtureId) ?? null;
}

export function getMetaOpsSnapshot(): MetaOpsSnapshot | null {
  return getSlot().snapshot;
}

export function setMetaOpsSnapshot(
  results: MetaConsensusResult[]
): MetaOpsSnapshot {
  const slot = getSlot();
  slot.byFixture.clear();
  for (const r of results) {
    slot.byFixture.set(r.fixtureId, r);
  }

  const byConsensus = [...results].sort(
    (a, b) => b.consensusScore - a.consensusScore
  );
  const byFp = [...results].sort(
    (a, b) => b.falsePositiveRisk - a.falsePositiveRisk
  );
  const byExec = results.filter(
    (r) =>
      r.executionDecision === "EXECUTE" ||
      r.executionDecision === "AGGRESSIVE_EXECUTE"
  );

  const gradeOrder: ExecutionGrade[] = ["S+", "S", "A", "B", "C", "D"];
  const gradeMap = new Map<ExecutionGrade, string[]>();
  for (const g of gradeOrder) gradeMap.set(g, []);
  for (const r of results) {
    gradeMap.get(r.executionGrade)?.push(r.fixtureId);
  }

  const engineCounts = new Map<string, number>();
  for (const r of results) {
    for (const eng of r.dominantEngines) {
      engineCounts.set(eng, (engineCounts.get(eng) ?? 0) + 1);
    }
  }
  const dominantEnginesSummary = [...engineCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([engine, weight]) => ({ engine, weight }));

  const n = results.length;
  const snapshot: MetaOpsSnapshot = {
    updatedAt: new Date().toISOString(),
    matchCount: n,
    averageConsensusScore:
      n > 0
        ? Math.round(
            results.reduce((s, r) => s + r.consensusScore, 0) / n
          )
        : 0,
    averageInstitutionalConfidence:
      n > 0
        ? Math.round(
            results.reduce((s, r) => s + r.institutionalConfidence, 0) / n
          )
        : 0,
    executionGrades: gradeOrder.map((grade) => ({
      grade,
      count: gradeMap.get(grade)?.length ?? 0,
      fixtures: (gradeMap.get(grade) ?? []).slice(0, 6),
    })),
    consensusHeatmap: byConsensus.slice(0, 12).map((r) => ({
      fixtureId: r.fixtureId,
      matchLabel: r.matchLabel,
      consensusScore: r.consensusScore,
      institutionalConfidence: r.institutionalConfidence,
      executionGrade: r.executionGrade,
      executionDecision: r.executionDecision,
    })),
    falsePositiveAlerts: byFp
      .filter((r) => r.falsePositiveRisk >= 50)
      .slice(0, 8)
      .map((r) => ({
        fixtureId: r.fixtureId,
        matchLabel: r.matchLabel,
        falsePositiveRisk: r.falsePositiveRisk,
        executionDecision: r.executionDecision,
      })),
    dominantEnginesSummary,
    topExecutions: byExec
      .sort((a, b) => b.consensusScore - a.consensusScore)
      .slice(0, 8)
      .map((r) => ({
        fixtureId: r.fixtureId,
        matchLabel: r.matchLabel,
        executionDecision: r.executionDecision,
        executionGrade: r.executionGrade,
        consensusScore: r.consensusScore,
      })),
    live: results,
  };

  slot.snapshot = snapshot;
  return snapshot;
}
