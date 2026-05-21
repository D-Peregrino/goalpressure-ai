/**
 * Análise histórica para o Validation Lab (signal_dispatches + matches).
 */

import { loadHistoricalBacktestDataset } from "@/lib/backtest/historicalDataLoader";
import {
  evaluateSignalResult,
  isSupportedBacktestMarket,
  toBacktestTradeResult,
  totalGoals,
} from "@/lib/backtest/resultEvaluator";
import type {
  BacktestHistoricalInput,
  BacktestSignalDispatchRow,
  BacktestTradeResult,
} from "@/types/backtest";
import type {
  EngineAccuracyRow,
  EngineConflictRow,
  FalsePositiveAnalysis,
  FalsePositiveCase,
  MarketEfficiencyAnalysis,
  ValidationPerformanceBreakdown,
  ValidationSegmentRow,
} from "@/types/validation";
import type { ExecutionGrade } from "@/types/meta";
import { resolveMatchPhase } from "@/lib/temporal/temporalDynamicsEngine";
import { logOps } from "@/lib/utils/logger";

const LOG_SCOPE = "validation-historical";

export interface AnalyzedTrade extends BacktestTradeResult {
  league: string;
  executionGrade: ExecutionGrade | "UNGRADED";
  triggerWindow: string;
  chaosLevel: string;
  temporalPhase: string;
  pressureRange: string;
  confidenceRange: string;
  dominantEngines: string[];
  fakeMomentum: number;
  edgePersistence: number;
  marketLag: boolean;
  engineConflict: number;
  closingLineEfficiency: number;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function pressureRange(score: number): string {
  if (score >= 80) return "80-100";
  if (score >= 65) return "65-79";
  return "0-64";
}

function confidenceRange(score: number): string {
  if (score >= 75) return "75-100";
  if (score >= 55) return "55-74";
  return "0-54";
}

function chaosLevelLabel(level: number): string {
  if (level >= 70) return "HIGH";
  if (level >= 45) return "MEDIUM";
  return "LOW";
}

function triggerWindowLabel(minute: number): string {
  if (minute < 30) return "0-29";
  if (minute < 60) return "30-59";
  if (minute < 80) return "60-79";
  return "80+";
}

function segmentFromTrades(
  trades: AnalyzedTrade[],
  pick: (t: AnalyzedTrade) => string
): ValidationSegmentRow[] {
  const map = new Map<
    string,
    { wins: number; losses: number; pending: number; profit: number; evSum: number }
  >();

  for (const t of trades) {
    const label = pick(t);
    const cur = map.get(label) ?? {
      wins: 0,
      losses: 0,
      pending: 0,
      profit: 0,
      evSum: 0,
    };
    cur.evSum += t.ev;
    if (t.outcome === "WIN") cur.wins += 1;
    else if (t.outcome === "LOSS") cur.losses += 1;
    else cur.pending += 1;
    cur.profit += t.profitUnits;
    map.set(label, cur);
  }

  return [...map.entries()]
    .map(([label, v]) => {
      const resolved = v.wins + v.losses;
      return {
        label,
        total: v.wins + v.losses + v.pending,
        wins: v.wins,
        losses: v.losses,
        pending: v.pending,
        hitRate: resolved > 0 ? v.wins / resolved : 0,
        roi: resolved > 0 ? v.profit / resolved : 0,
        profitUnits: round4(v.profit),
        averageEv:
          v.wins + v.losses + v.pending > 0
            ? v.evSum / (v.wins + v.losses + v.pending)
            : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}

function analyzeTrades(input: BacktestHistoricalInput): AnalyzedTrade[] {
  const matchIndex = new Map<string, BacktestHistoricalInput["matches"][0]>();
  for (const m of input.matches) {
    matchIndex.set(m.fixtureId, m);
    if (m.matchId) matchIndex.set(m.matchId, m);
  }

  const analyzed: AnalyzedTrade[] = [];

  for (const d of input.signalDispatches) {
    if (!d.triggered || !isSupportedBacktestMarket(d.market)) continue;

    const match =
      matchIndex.get(d.fixtureId) ?? matchIndex.get(`sm-${d.fixtureId}`);
    const meta = d.metadata ?? {};
    const minute =
      typeof meta.minute === "number"
        ? meta.minute
        : match?.triggerMinute ?? 0;
    const goalsAtTrigger =
      typeof meta.goals_at_trigger === "number"
        ? meta.goals_at_trigger
        : typeof meta.goalsAtTrigger === "number"
          ? meta.goalsAtTrigger
          : match?.goalsAtTrigger ?? 0;
    const goalsAtResolution = match?.finalScore
      ? totalGoals(match.finalScore)
      : null;
    const finished = match?.status === "FINISHED";

    const evalInput = {
      dispatchId: d.id ?? `${d.fixtureId}-${d.market}`,
      fixtureId: d.fixtureId,
      market: d.market,
      marketOdd: d.marketOdd,
      ev: d.ev,
      pressureScore: d.pressureScore,
      momentum: d.momentum,
      confidence: d.confidence,
      goalsAtTrigger,
      goalsAtResolution,
      triggerMinute: minute,
      createdAt: d.createdAt,
      matchFinished: finished,
    };

    const evalResult = evaluateSignalResult(evalInput);
    if (!evalResult) continue;

    const trade = toBacktestTradeResult(evalInput, evalResult);
    const chaos = Number(meta.chaos_level ?? meta.sustained_chaos ?? 0);
    const dominantEngines = Array.isArray(meta.dominant_engines)
      ? (meta.dominant_engines as string[])
      : typeof meta.dominantEngines === "string"
        ? [meta.dominantEngines]
        : [];

    analyzed.push({
      ...trade,
      league: (match?.league as string) ?? (meta.league as string) ?? "UNKNOWN",
      executionGrade:
        (meta.meta_grade as ExecutionGrade) ??
        (meta.execution_grade as ExecutionGrade) ??
        "UNGRADED",
      triggerWindow: triggerWindowLabel(minute),
      chaosLevel: chaosLevelLabel(chaos || d.momentum),
      temporalPhase: resolveMatchPhase(minute),
      pressureRange: pressureRange(d.pressureScore),
      confidenceRange: confidenceRange(d.confidence),
      dominantEngines,
      fakeMomentum: Number(meta.fake_momentum ?? meta.fakeMomentum ?? 0),
      edgePersistence: Number(meta.edge_persistence ?? meta.edgePersistence ?? 0),
      marketLag: Boolean(meta.market_lag ?? meta.marketLag),
      engineConflict: Number(meta.engine_conflict ?? meta.engineConflict ?? 0),
      closingLineEfficiency: Number(
        meta.closing_line_efficiency ?? meta.closingLineEfficiency ?? 50
      ),
    });
  }

  return analyzed;
}

export function buildPerformanceBreakdown(
  trades: AnalyzedTrade[]
): ValidationPerformanceBreakdown {
  return {
    byExecutionGrade: segmentFromTrades(trades, (t) => t.executionGrade),
    byLeague: segmentFromTrades(trades, (t) => t.league),
    byMarket: segmentFromTrades(trades, (t) => t.market),
    byTriggerWindow: segmentFromTrades(trades, (t) => t.triggerWindow),
    byChaosLevel: segmentFromTrades(trades, (t) => t.chaosLevel),
    byTemporalPhase: segmentFromTrades(trades, (t) => t.temporalPhase),
    byPressureRange: segmentFromTrades(trades, (t) => t.pressureRange),
    byConfidenceRange: segmentFromTrades(trades, (t) => t.confidenceRange),
  };
}

export function buildFalsePositiveAnalysis(
  trades: AnalyzedTrade[]
): FalsePositiveAnalysis {
  const failedSignals: FalsePositiveCase[] = [];
  const fakeMomentum: FalsePositiveCase[] = [];
  const falseEdge: FalsePositiveCase[] = [];
  const unproductivePressure: FalsePositiveCase[] = [];
  const chaosNoConversion: FalsePositiveCase[] = [];

  for (const t of trades) {
    if (t.outcome !== "LOSS") continue;

    const base = {
      dispatchId: t.dispatchId,
      fixtureId: t.fixtureId,
      market: t.market,
      minute: t.triggerMinute,
      pressureScore: t.pressureScore,
      momentum: t.momentum,
      ev: t.ev,
      executionGrade: t.executionGrade !== "UNGRADED" ? t.executionGrade : undefined,
    };

    failedSignals.push({
      ...base,
      category: "FAILED_SIGNAL",
      detail: `Loss on ${t.market} at min ${t.triggerMinute}`,
    });

    if (t.fakeMomentum >= 55) {
      fakeMomentum.push({
        ...base,
        category: "FAKE_MOMENTUM",
        detail: `Fake momentum ${t.fakeMomentum.toFixed(0)}%`,
      });
    }

    if (t.ev > 0.08 && t.realizedEv <= 0) {
      falseEdge.push({
        ...base,
        category: "FALSE_EDGE",
        detail: `EV ${(t.ev * 100).toFixed(1)}% did not realize`,
      });
    }

    if (t.pressureScore >= 70 && t.newGoalsAfterTrigger === 0) {
      unproductivePressure.push({
        ...base,
        category: "UNPRODUCTIVE_PRESSURE",
        detail: `Pressure ${t.pressureScore} without conversion`,
      });
    }

    if (t.chaosLevel === "HIGH" && t.newGoalsAfterTrigger === 0) {
      chaosNoConversion.push({
        ...base,
        category: "CHAOS_NO_CONVERSION",
        detail: "High chaos without goal conversion",
      });
    }
  }

  return {
    failedSignals: failedSignals.slice(0, 40),
    fakeMomentum: fakeMomentum.slice(0, 25),
    falseEdge: falseEdge.slice(0, 25),
    unproductivePressure: unproductivePressure.slice(0, 25),
    chaosNoConversion: chaosNoConversion.slice(0, 25),
    totalFlagged:
      failedSignals.length +
      fakeMomentum.length +
      falseEdge.length +
      unproductivePressure.length +
      chaosNoConversion.length,
  };
}

export function buildMarketEfficiencyAnalysis(
  trades: AnalyzedTrade[]
): MarketEfficiencyAnalysis {
  const resolved = trades.filter((t) => t.outcome !== "PENDING");
  if (resolved.length === 0) {
    return {
      closingLineEfficiency: 0,
      edgePersistence: 0,
      steamReactionScore: 0,
      oddsLagScore: 0,
      samples: 0,
    };
  }

  const cle =
    resolved.reduce((s, t) => s + t.closingLineEfficiency, 0) / resolved.length;
  const edgePersist =
    resolved.reduce((s, t) => s + t.edgePersistence, 0) / resolved.length;
  const steam =
    resolved.filter((t) => t.marketLag && t.outcome === "WIN").length /
    Math.max(1, resolved.filter((t) => t.marketLag).length);
  const lagWins = resolved.filter((t) => t.marketLag && t.outcome === "WIN").length;
  const lagTotal = resolved.filter((t) => t.marketLag).length;

  return {
    closingLineEfficiency: round4(cle),
    edgePersistence: round4(edgePersist),
    steamReactionScore: round4(steam * 100),
    oddsLagScore: round4(lagTotal > 0 ? (lagWins / lagTotal) * 100 : 0),
    samples: resolved.length,
  };
}

export function buildEngineConsensusAnalysis(
  trades: AnalyzedTrade[]
): {
  engineAccuracy: EngineAccuracyRow[];
  dominantEnginesRoi: ValidationSegmentRow[];
  engineConflicts: EngineConflictRow[];
} {
  const engineMap = new Map<
    string,
    { wins: number; losses: number; profit: number }
  >();

  for (const t of trades) {
    const engines =
      t.dominantEngines.length > 0 ? t.dominantEngines : ["UNATTRIBUTED"];
    for (const eng of engines) {
      const cur = engineMap.get(eng) ?? { wins: 0, losses: 0, profit: 0 };
      if (t.outcome === "WIN") cur.wins += 1;
      if (t.outcome === "LOSS") cur.losses += 1;
      cur.profit += t.profitUnits;
      engineMap.set(eng, cur);
    }
  }

  const engineAccuracy: EngineAccuracyRow[] = [...engineMap.entries()]
    .map(([engine, v]) => {
      const resolved = v.wins + v.losses;
      return {
        engine,
        totalAttributed: resolved,
        wins: v.wins,
        hitRate: resolved > 0 ? v.wins / resolved : 0,
        roi: resolved > 0 ? v.profit / resolved : 0,
        profitUnits: round4(v.profit),
      };
    })
    .sort((a, b) => b.hitRate - a.hitRate);

  const dominantEnginesRoi = segmentFromTrades(trades, (t) =>
    t.dominantEngines.length > 0 ? t.dominantEngines.join("+") : "UNATTRIBUTED"
  );

  const engineConflicts: EngineConflictRow[] = trades
    .filter((t) => t.engineConflict >= 40 && t.outcome !== "PENDING")
    .slice(0, 30)
    .map((t) => ({
      fixtureId: t.fixtureId,
      conflictScore: t.engineConflict,
      dominantEngines: t.dominantEngines,
      outcome: t.outcome as "WIN" | "LOSS",
    }));

  return { engineAccuracy, dominantEnginesRoi, engineConflicts };
}

export async function loadAndAnalyzeHistoricalTrades(): Promise<{
  trades: AnalyzedTrade[];
  source: string;
}> {
  const loaded = await loadHistoricalBacktestDataset({ dispatchLimit: 600 });
  const trades = analyzeTrades(loaded.input);

  logOps(LOG_SCOPE, `[live-validation] historical analyzed trades=${trades.length}`, {
    source: loaded.source,
  });

  return { trades, source: loaded.source };
}
