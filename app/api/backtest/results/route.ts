import { NextResponse } from "next/server";
import { fetchBacktestResults, getBacktestOpsSnapshot } from "@/lib/backtest";
import { logInfo, logWarn } from "@/lib/utils/logger";
import type { BacktestResultsApiResponse } from "@/types/backtestApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_SCOPE = "api/backtest/results";

export async function GET(request: Request): Promise<NextResponse<BacktestResultsApiResponse>> {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const strategy = url.searchParams.get("strategy") ?? undefined;
  const market = url.searchParams.get("market") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? "20");

  try {
    const [rows, snapshot] = await Promise.all([
      fetchBacktestResults({
        limit: Number.isFinite(limit) ? limit : 20,
        strategy,
        market,
      }),
      Promise.resolve(getBacktestOpsSnapshot()),
    ]);

    logInfo(ROUTE_SCOPE, "Backtest results served", {
      rows: rows.length,
      hasSnapshot: Boolean(snapshot),
    });

    return NextResponse.json({
      ok: true,
      snapshot,
      rows,
      meta: {
        fetchedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - startedAt,
        count: rows.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logWarn(ROUTE_SCOPE, "Backtest results failed", { message });

    return NextResponse.json(
      { ok: false, error: { message } },
      { status: 500 }
    );
  }
}
