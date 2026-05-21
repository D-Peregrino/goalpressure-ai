import type { BacktestResultsRow, HistoricalBacktestResult } from "@/types/backtest";
import type { BacktestOpsSnapshot } from "@/lib/backtest/backtestSnapshot";

export interface BacktestRunMeta {
  fetchedAt: string;
  responseTimeMs: number;
  source: string;
  counts: {
    matches: number;
    dispatches: number;
    metrics: number;
  };
  persistedRows: number;
}

export interface BacktestRunSuccessResponse {
  ok: true;
  result: HistoricalBacktestResult;
  byMarket: {
    over05: HistoricalBacktestResult;
    over15: HistoricalBacktestResult;
  };
  snapshot: BacktestOpsSnapshot;
  meta: BacktestRunMeta;
}

export interface BacktestResultsSuccessResponse {
  ok: true;
  snapshot: BacktestOpsSnapshot | null;
  rows: BacktestResultsRow[];
  meta: {
    fetchedAt: string;
    responseTimeMs: number;
    count: number;
  };
}

export interface BacktestApiErrorResponse {
  ok: false;
  error: { message: string };
}

export type BacktestRunApiResponse =
  | BacktestRunSuccessResponse
  | BacktestApiErrorResponse;

export type BacktestResultsApiResponse =
  | BacktestResultsSuccessResponse
  | BacktestApiErrorResponse;
