import { NextResponse } from "next/server";
import {
  loadHistoricalBacktestDataset,
  persistBacktestResultBatch,
  runHistoricalBacktestByMarket,
  setBacktestOpsSnapshot,
} from "@/lib/backtest";
import { fetchBacktestResults } from "@/lib/backtest/backtestPersistence";
import { logInfo, logOps, logWarn } from "@/lib/utils/logger";
import type { BacktestRunApiResponse } from "@/types/backtestApi";
import type { BacktestHistoricalInput } from "@/types/backtest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_SCOPE = "api/backtest/run";

export async function POST(request: Request): Promise<NextResponse<BacktestRunApiResponse>> {
  const startedAt = Date.now();

  try {
    let customInput: BacktestHistoricalInput | null = null;

    try {
      const body = (await request.json()) as Partial<BacktestHistoricalInput>;
      if (body?.signalDispatches && Array.isArray(body.signalDispatches)) {
        customInput = {
          matches: body.matches ?? [],
          liveMetrics: body.liveMetrics ?? [],
          signalDispatches: body.signalDispatches,
          strategy: body.strategy ?? "signal_decision_ev_plus",
        };
      }
    } catch {
      // empty body — load from Supabase
    }

    const loaded = customInput
      ? {
          input: customInput,
          source: "request_body" as const,
          counts: {
            matches: customInput.matches.length,
            dispatches: customInput.signalDispatches.length,
            metrics: customInput.liveMetrics?.length ?? 0,
          },
        }
      : await loadHistoricalBacktestDataset();

    logOps(ROUTE_SCOPE, "[backtest-engine] run started", loaded.counts);

    const byMarket = runHistoricalBacktestByMarket(loaded.input);
    const results = [byMarket.aggregate, byMarket.over05, byMarket.over15];

    const persistedRows = await persistBacktestResultBatch(results);
    const stored = await fetchBacktestResults({ limit: 10 });

    const snapshot = setBacktestOpsSnapshot(
      byMarket.aggregate,
      { over05: byMarket.over05, over15: byMarket.over15 },
      stored
    );

    logInfo(ROUTE_SCOPE, "Backtest run completed", {
      totalSignals: byMarket.aggregate.totalSignals,
      roi: byMarket.aggregate.roi,
      hitRate: byMarket.aggregate.hitRate,
      persistedRows,
    });

    return NextResponse.json({
      ok: true,
      result: byMarket.aggregate,
      byMarket: {
        over05: byMarket.over05,
        over15: byMarket.over15,
      },
      snapshot,
      meta: {
        fetchedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - startedAt,
        source: loaded.source,
        counts: loaded.counts,
        persistedRows,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logWarn(ROUTE_SCOPE, "Backtest run failed", { message });
    logOps(ROUTE_SCOPE, `[backtest-engine] run failed: ${message}`);

    return NextResponse.json(
      { ok: false, error: { message } },
      { status: 500 }
    );
  }
}

export async function GET(request: Request): Promise<NextResponse<BacktestRunApiResponse>> {
  const url = new URL(request.url);
  const since = url.searchParams.get("since");
  const startedAt = Date.now();

  try {
    const loaded = await loadHistoricalBacktestDataset({
      sinceIso: since ?? undefined,
    });

    const byMarket = runHistoricalBacktestByMarket(loaded.input);
    const persistedRows = await persistBacktestResultBatch([
      byMarket.aggregate,
      byMarket.over05,
      byMarket.over15,
    ]);
    const stored = await fetchBacktestResults({ limit: 10 });
    const snapshot = setBacktestOpsSnapshot(
      byMarket.aggregate,
      { over05: byMarket.over05, over15: byMarket.over15 },
      stored
    );

    return NextResponse.json({
      ok: true,
      result: byMarket.aggregate,
      byMarket: {
        over05: byMarket.over05,
        over15: byMarket.over15,
      },
      snapshot,
      meta: {
        fetchedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - startedAt,
        source: loaded.source,
        counts: loaded.counts,
        persistedRows,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: { message } },
      { status: 500 }
    );
  }
}
