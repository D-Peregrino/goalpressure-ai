export {
  runHistoricalBacktest,
  runHistoricalBacktestByMarket,
  type RunHistoricalBacktestOptions,
} from "@/lib/backtest/backtestEngine";

export {
  evaluateSignalResult,
  evaluateGoalOutcome,
  calculateTradeRoi,
  calculateRealizedEv,
  BACKTEST_STAKE_UNITS,
} from "@/lib/backtest/resultEvaluator";

export {
  loadHistoricalBacktestDataset,
  type LoadHistoricalDatasetOptions,
  type LoadHistoricalDatasetResult,
} from "@/lib/backtest/historicalDataLoader";

export {
  persistBacktestResult,
  persistBacktestResultBatch,
  fetchBacktestResults,
} from "@/lib/backtest/backtestPersistence";

export {
  getBacktestOpsSnapshot,
  setBacktestOpsSnapshot,
  type BacktestOpsSnapshot,
} from "@/lib/backtest/backtestSnapshot";
