/**
 * GoalPressure AI — Backtesting Engine institucional.
 * Valida historicamente o Signal Decision Engine via signal_dispatches + matches.
 */

import type {
  BacktestHistoricalInput,
  BacktestSignalDispatchRow,
  BacktestStreaks,
  BacktestStrategy,
  BacktestTradeResult,
  HistoricalBacktestResult,
} from "@/types/backtest";
import type { MarketType } from "@/types/domain";
import { logOps } from "@/lib/utils/logger";
import {
  BACKTEST_STAKE_UNITS,
  evaluateSignalResult,
  isSupportedBacktestMarket,
  toBacktestTradeResult,
  totalGoals,
  type EvaluateSignalInput,
} from "@/lib/backtest/resultEvaluator";

const LOG_SCOPE = "backtest-engine";

export interface RunHistoricalBacktestOptions {
  strategy?: BacktestStrategy;
  /** Filtrar mercado agregado no output (ALL = todos juntos) */
  marketFilter?: MarketType | "ALL";
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function isFinishedStatus(status?: string): boolean {
  return status === "FINISHED" || status === "FT" || status === "AET";
}

function resolveGoalsAtTrigger(
  dispatch: BacktestSignalDispatchRow,
  matchGoalsFinal: number | null
): number {
  const meta = dispatch.metadata ?? {};
  if (typeof meta.goals_at_trigger === "number") {
    return Math.max(0, meta.goals_at_trigger);
  }
  if (typeof meta.goalsAtTrigger === "number") {
    return Math.max(0, meta.goalsAtTrigger);
  }
  return 0;
}

function resolveTriggerMinute(dispatch: BacktestSignalDispatchRow): number {
  const meta = dispatch.metadata ?? {};
  if (typeof meta.minute === "number") return meta.minute;
  return 0;
}

function buildMatchIndex(
  input: BacktestHistoricalInput
): Map<string, BacktestHistoricalInput["matches"][0]> {
  const map = new Map<string, BacktestHistoricalInput["matches"][0]>();
  for (const m of input.matches) {
    map.set(m.fixtureId, m);
    if (m.matchId) map.set(m.matchId, m);
    map.set(`sm-${m.fixtureId}`, m);
  }
  return map;
}

function filterDispatches(
  dispatches: BacktestSignalDispatchRow[],
  strategy: BacktestStrategy
): BacktestSignalDispatchRow[] {
  const triggered = dispatches.filter(
    (d) => d.triggered && isSupportedBacktestMarket(d.market)
  );

  if (strategy === "all_triggered_dispatches") {
    return triggered;
  }

  return triggered.filter((d) => d.ev > 0);
}

function computeStreaks(trades: BacktestTradeResult[]): BacktestStreaks {
  let maxWin = 0;
  let maxLose = 0;
  let currentWin = 0;
  let currentLose = 0;
  let winRun = 0;
  let loseRun = 0;

  for (const t of trades) {
    if (t.outcome === "PENDING") continue;

    if (t.outcome === "WIN") {
      winRun += 1;
      loseRun = 0;
      maxWin = Math.max(maxWin, winRun);
    } else {
      loseRun += 1;
      winRun = 0;
      maxLose = Math.max(maxLose, loseRun);
    }
  }

  const resolved = trades.filter((t) => t.outcome !== "PENDING");
  for (let i = resolved.length - 1; i >= 0; i--) {
    const t = resolved[i];
    if (t.outcome === "WIN") {
      currentWin += 1;
      break;
    }
    currentLose += 1;
  }

  if (currentWin === 0 && resolved.length > 0) {
    currentLose = 0;
    for (let i = resolved.length - 1; i >= 0; i--) {
      if (resolved[i].outcome === "LOSS") currentLose += 1;
      else break;
    }
  }

  return {
    maxWinStreak: maxWin,
    maxLoseStreak: maxLose,
    currentWinStreak: currentWin,
    currentLoseStreak: currentLose,
  };
}

function computeMaxDrawdown(trades: BacktestTradeResult[]): number {
  let peak = 0;
  let cumulative = 0;
  let maxDd = 0;

  for (const t of trades) {
    if (t.outcome === "PENDING") continue;
    cumulative += t.profitUnits;
    peak = Math.max(peak, cumulative);
    maxDd = Math.max(maxDd, peak - cumulative);
  }

  return round4(maxDd);
}

function computeSharpeLike(trades: BacktestTradeResult[]): number {
  const returns = trades
    .filter((t) => t.outcome !== "PENDING")
    .map((t) => t.roi);

  if (returns.length < 2) return 0;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  const std = Math.sqrt(variance);
  if (std < 1e-9) return mean > 0 ? 1 : 0;

  return round3((mean / std) * Math.sqrt(returns.length));
}

function aggregateTrades(
  trades: BacktestTradeResult[],
  strategy: BacktestStrategy,
  marketLabel: string
): HistoricalBacktestResult {
  const resolved = trades.filter((t) => t.outcome !== "PENDING");
  const wins = resolved.filter((t) => t.outcome === "WIN").length;
  const losses = resolved.filter((t) => t.outcome === "LOSS").length;
  const pending = trades.filter((t) => t.outcome === "PENDING").length;
  const totalSignals = resolved.length;

  const profitUnits = round4(
    resolved.reduce((s, t) => s + t.profitUnits, 0)
  );
  const totalStaked = totalSignals * BACKTEST_STAKE_UNITS;
  const roi = totalStaked > 0 ? round4(profitUnits / totalStaked) : 0;
  const yieldPct = totalStaked > 0 ? round4((profitUnits / totalStaked) * 100) : 0;
  const hitRate = totalSignals > 0 ? round4(wins / totalSignals) : 0;
  const averageEv =
    resolved.length > 0
      ? round4(resolved.reduce((s, t) => s + t.realizedEv, 0) / resolved.length)
      : 0;
  const averageOdd =
    resolved.length > 0
      ? round4(resolved.reduce((s, t) => s + t.odd, 0) / resolved.length)
      : 0;

  return {
    strategy,
    market: marketLabel,
    totalSignals,
    wins,
    losses,
    pending,
    roi,
    yield: yieldPct,
    hitRate,
    averageEv,
    averageOdd,
    profitUnits,
    maxDrawdown: computeMaxDrawdown(trades),
    streaks: computeStreaks(trades),
    sharpeLikeRatio: computeSharpeLike(trades),
    trades,
    runAt: new Date().toISOString(),
  };
}

/**
 * Executa backtest histórico sobre matches + signal_dispatches (+ live_metrics opcional).
 */
export function runHistoricalBacktest(
  input: BacktestHistoricalInput,
  options: RunHistoricalBacktestOptions = {}
): HistoricalBacktestResult {
  const strategy = options.strategy ?? input.strategy ?? "signal_decision_ev_plus";
  const matchIndex = buildMatchIndex(input);
  const dispatches = filterDispatches(input.signalDispatches, strategy);

  const trades: BacktestTradeResult[] = [];

  for (const dispatch of dispatches) {
    const match =
      matchIndex.get(dispatch.fixtureId) ??
      matchIndex.get(`sm-${dispatch.fixtureId}`);

    const finished = match ? isFinishedStatus(match.status) : false;
    const goalsAtResolution = match?.finalScore
      ? totalGoals(match.finalScore)
      : null;

    const evalInput: EvaluateSignalInput = {
      dispatchId: dispatch.id ?? `${dispatch.fixtureId}-${dispatch.createdAt}`,
      fixtureId: dispatch.fixtureId,
      market: dispatch.market,
      marketOdd: dispatch.marketOdd,
      ev: dispatch.ev,
      pressureScore: dispatch.pressureScore,
      momentum: dispatch.momentum,
      confidence: dispatch.confidence,
      goalsAtTrigger:
        match?.goalsAtTrigger ?? resolveGoalsAtTrigger(dispatch, goalsAtResolution),
      goalsAtResolution,
      triggerMinute:
        match?.triggerMinute ?? resolveTriggerMinute(dispatch),
      createdAt: dispatch.createdAt,
      matchFinished: finished,
    };

    const evaluation = evaluateSignalResult(evalInput);
    if (!evaluation) continue;

    trades.push(toBacktestTradeResult(evalInput, evaluation));
  }

  trades.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const marketFilter = options.marketFilter ?? "ALL";
  const filteredTrades =
    marketFilter === "ALL"
      ? trades
      : trades.filter((t) => t.market === marketFilter);

  const result = aggregateTrades(filteredTrades, strategy, marketFilter);

  logOps(LOG_SCOPE, "[backtest-engine] run complete", {
    strategy,
    market: marketFilter,
    totalSignals: result.totalSignals,
    wins: result.wins,
    losses: result.losses,
    roi: result.roi,
    hitRate: result.hitRate,
    profitUnits: result.profitUnits,
    maxDrawdown: result.maxDrawdown,
    sharpeLikeRatio: result.sharpeLikeRatio,
  });

  for (const t of filteredTrades.filter((x) => x.outcome !== "PENDING").slice(-5)) {
    logOps(
      LOG_SCOPE,
      `[backtest-engine] fixture=${t.fixtureId} market=${t.market} ${t.outcome} EV=${t.realizedEv} P=${t.pressureScore} M=${t.momentum}`
    );
  }

  return result;
}

/**
 * Backtest segmentado por mercado (OVER_0_5 e OVER_1_5) + agregado.
 */
export function runHistoricalBacktestByMarket(
  input: BacktestHistoricalInput,
  options?: RunHistoricalBacktestOptions
): {
  aggregate: HistoricalBacktestResult;
  over05: HistoricalBacktestResult;
  over15: HistoricalBacktestResult;
} {
  return {
    aggregate: runHistoricalBacktest(input, {
      ...options,
      marketFilter: "ALL",
    }),
    over05: runHistoricalBacktest(input, {
      ...options,
      marketFilter: "OVER_0_5",
    }),
    over15: runHistoricalBacktest(input, {
      ...options,
      marketFilter: "OVER_1_5",
    }),
  };
}
