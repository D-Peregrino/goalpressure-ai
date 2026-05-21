"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BacktestResultsApiResponse } from "@/types/backtestApi";
import type { BacktestOpsSnapshot } from "@/lib/backtest/backtestSnapshot";
import type { BacktestResultsRow } from "@/types/backtest";
import type { HistoricalBacktestResult } from "@/types/backtest";

const RESULTS_PATH = "/api/backtest/results";
const RUN_PATH = "/api/backtest/run";

export type BacktestFeedStatus = "loading" | "ready" | "error";

export interface BacktestSegmentRow {
  label: string;
  total: number;
  wins: number;
  hitRate: number;
  roi: number;
}

export interface UseBacktestResult {
  snapshot: BacktestOpsSnapshot | null;
  rows: BacktestResultsRow[];
  lastRun: HistoricalBacktestResult | null;
  byMarket: BacktestSegmentRow[];
  byPressureRange: BacktestSegmentRow[];
  byTemporalPhase: BacktestSegmentRow[];
  byExecutionGrade: BacktestSegmentRow[];
  status: BacktestFeedStatus;
  error: string | null;
  lastUpdated: number | null;
  runBacktest: () => Promise<void>;
  running: boolean;
}

function segmentFromTrades(
  trades: HistoricalBacktestResult["trades"],
  pick: (t: HistoricalBacktestResult["trades"][0]) => string
): BacktestSegmentRow[] {
  const map = new Map<string, { wins: number; total: number; profit: number }>();

  for (const t of trades) {
    const label = pick(t);
    const cur = map.get(label) ?? { wins: 0, total: 0, profit: 0 };
    cur.total += 1;
    if (t.outcome === "WIN") cur.wins += 1;
    cur.profit += t.profitUnits;
    map.set(label, cur);
  }

  return [...map.entries()].map(([label, v]) => ({
    label,
    total: v.total,
    wins: v.wins,
    hitRate: v.total > 0 ? v.wins / v.total : 0,
    roi: v.total > 0 ? v.profit / v.total : 0,
  }));
}

export function useBacktest(): UseBacktestResult {
  const [snapshot, setSnapshot] = useState<BacktestOpsSnapshot | null>(null);
  const [rows, setRows] = useState<BacktestResultsRow[]>([]);
  const [status, setStatus] = useState<BacktestFeedStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const requestIdRef = useRef(0);

  const fetchResults = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const res = await fetch(RESULTS_PATH, { cache: "no-store" });
      const data = (await res.json()) as BacktestResultsApiResponse;

      if (requestId !== requestIdRef.current) return;

      if (!res.ok || !data.ok) {
        setError(
          !data.ok && "error" in data
            ? data.error.message
            : `HTTP ${res.status}`
        );
        setStatus("error");
        return;
      }

      setSnapshot(data.snapshot);
      setRows(data.rows);
      setLastUpdated(Date.now());
      setError(null);
      setStatus("ready");
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to load backtest");
      setStatus("error");
    }
  }, []);

  const runBacktest = useCallback(async () => {
    setRunning(true);
    try {
      await fetch(RUN_PATH, { method: "POST", cache: "no-store" });
      await fetchResults();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backtest run failed");
      setStatus("error");
    } finally {
      setRunning(false);
    }
  }, [fetchResults]);

  useEffect(() => {
    void fetchResults();
  }, [fetchResults]);

  const lastRun = snapshot?.lastRun ?? null;
  const trades = lastRun?.trades ?? [];

  const byMarket = segmentFromTrades(trades, (t) => t.market);
  const byPressureRange = segmentFromTrades(trades, (t) => {
    if (t.pressureScore >= 80) return "80-100";
    if (t.pressureScore >= 65) return "65-79";
    return "0-64";
  });
  const byTemporalPhase = segmentFromTrades(trades, (t) => {
    const m = t.triggerMinute;
    if (m < 30) return "EARLY";
    if (m < 60) return "MID";
    if (m < 80) return "LATE";
    return "STOPPAGE";
  });
  const byExecutionGrade = segmentFromTrades(trades, (t) => {
    const meta = (t as { metadata?: { meta_grade?: string } }).metadata;
    return meta?.meta_grade ?? "UNGRADED";
  });

  return {
    snapshot,
    rows,
    lastRun,
    byMarket,
    byPressureRange,
    byTemporalPhase,
    byExecutionGrade,
    status,
    error,
    lastUpdated,
    runBacktest,
    running,
  };
}
