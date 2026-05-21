/**
 * Snapshot in-memory do último backtest — exposto em /ops e /api/backtest/results.
 */

import type { HistoricalBacktestResult } from "@/types/backtest";
import type { BacktestResultsRow } from "@/types/backtest";

export interface BacktestOpsSnapshot {
  updatedAt: string | null;
  lastRun: HistoricalBacktestResult | null;
  byMarket: {
    over05: HistoricalBacktestResult | null;
    over15: HistoricalBacktestResult | null;
  };
  storedResults: BacktestResultsRow[];
  /** KPIs agregados para dashboard */
  roi: number;
  hitRate: number;
  averageEv: number;
  profitUnits: number;
  maxDrawdown: number;
  winStreak: number;
  loseStreak: number;
}

interface GlobalBacktestSlot {
  snapshot: BacktestOpsSnapshot | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_BACKTEST__: GlobalBacktestSlot | undefined;
}

function getSlot(): GlobalBacktestSlot {
  if (!globalThis.__GP_BACKTEST__) {
    globalThis.__GP_BACKTEST__ = { snapshot: null };
  }
  return globalThis.__GP_BACKTEST__;
}

function buildKpisFromResult(
  result: HistoricalBacktestResult | null
): Pick<
  BacktestOpsSnapshot,
  | "roi"
  | "hitRate"
  | "averageEv"
  | "profitUnits"
  | "maxDrawdown"
  | "winStreak"
  | "loseStreak"
> {
  if (!result) {
    return {
      roi: 0,
      hitRate: 0,
      averageEv: 0,
      profitUnits: 0,
      maxDrawdown: 0,
      winStreak: 0,
      loseStreak: 0,
    };
  }

  return {
    roi: result.roi,
    hitRate: result.hitRate,
    averageEv: result.averageEv,
    profitUnits: result.profitUnits,
    maxDrawdown: result.maxDrawdown,
    winStreak: result.streaks.currentWinStreak,
    loseStreak: result.streaks.currentLoseStreak,
  };
}

export function getBacktestOpsSnapshot(): BacktestOpsSnapshot | null {
  return getSlot().snapshot;
}

export function setBacktestOpsSnapshot(
  aggregate: HistoricalBacktestResult,
  byMarket: {
    over05: HistoricalBacktestResult;
    over15: HistoricalBacktestResult;
  },
  storedResults: BacktestResultsRow[] = []
): BacktestOpsSnapshot {
  const kpis = buildKpisFromResult(aggregate);

  const snapshot: BacktestOpsSnapshot = {
    updatedAt: new Date().toISOString(),
    lastRun: aggregate,
    byMarket: {
      over05: byMarket.over05,
      over15: byMarket.over15,
    },
    storedResults,
    ...kpis,
  };

  getSlot().snapshot = snapshot;
  return snapshot;
}
