/**
 * Persistência Supabase — backtest_results.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type { BacktestResultsRow } from "@/types/backtest";
import type { HistoricalBacktestResult } from "@/types/backtest";
import { logInfo, logOps, logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "backtest-persistence";

function mapResultToRow(result: HistoricalBacktestResult): BacktestResultsRow {
  return {
    strategy: result.strategy,
    market: result.market,
    total_signals: result.totalSignals,
    wins: result.wins,
    losses: result.losses,
    roi: result.roi,
    yield: result.yield,
    hit_rate: result.hitRate,
    profit_units: result.profitUnits,
    max_drawdown: result.maxDrawdown,
    metadata: {
      pending: result.pending,
      average_ev: result.averageEv,
      average_odd: result.averageOdd,
      sharpe_like_ratio: result.sharpeLikeRatio,
      streaks: result.streaks,
      run_at: result.runAt,
      trade_count: result.trades.length,
    },
  };
}

export async function persistBacktestResult(
  result: HistoricalBacktestResult
): Promise<{ persisted: boolean; id?: string }> {
  if (!isSupabaseConfigured()) {
    return { persisted: false };
  }

  const client = getSupabaseAdmin();
  if (!client) return { persisted: false };

  const row = mapResultToRow(result);

  try {
    const { data, error } = await client
      .from("backtest_results")
      .insert(row)
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    logInfo(LOG_SCOPE, "Backtest result saved", {
      strategy: row.strategy,
      market: row.market,
      id: data?.id,
    });

    return { persisted: true, id: data?.id as string | undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logWarn(LOG_SCOPE, "backtest_results insert failed", { message });
    logOps(LOG_SCOPE, `[backtest-engine] persist failed: ${message}`);
    return { persisted: false };
  }
}

export async function persistBacktestResultBatch(
  results: HistoricalBacktestResult[]
): Promise<number> {
  let n = 0;
  for (const r of results) {
    const { persisted } = await persistBacktestResult(r);
    if (persisted) n += 1;
  }
  return n;
}

export interface FetchBacktestResultsOptions {
  limit?: number;
  strategy?: string;
  market?: string;
}

export async function fetchBacktestResults(
  options: FetchBacktestResultsOptions = {}
): Promise<BacktestResultsRow[]> {
  if (!isSupabaseConfigured()) return [];

  const client = getSupabaseAdmin();
  if (!client) return [];

  const limit = options.limit ?? 20;

  let query = client
    .from("backtest_results")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.strategy) {
    query = query.eq("strategy", options.strategy);
  }
  if (options.market) {
    query = query.eq("market", options.market);
  }

  const { data, error } = await query;

  if (error) {
    logWarn(LOG_SCOPE, "fetch backtest_results failed", {
      message: error.message,
    });
    return [];
  }

  return (data ?? []) as BacktestResultsRow[];
}
