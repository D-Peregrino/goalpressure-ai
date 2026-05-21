import { NextResponse } from "next/server";
import {
  buildMarketOpsSnapshot,
  getMarketCalibrationOpsSnapshot,
} from "@/lib/market";
import { fetchRecentMarketEdges } from "@/lib/market/marketPersistence";
import { logInfo, logWarn } from "@/lib/utils/logger";
import type { MarketEdgesApiResponse } from "@/types/marketApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_SCOPE = "api/market/edges";

export async function GET(request: Request): Promise<NextResponse<MarketEdgesApiResponse>> {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const fixtureId = url.searchParams.get("fixtureId") ?? undefined;
  const classification = url.searchParams.get("classification") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? "50");

  try {
    const rows = await fetchRecentMarketEdges({
      limit: Number.isFinite(limit) ? limit : 50,
      fixtureId,
      classification,
    });

    let snapshot = getMarketCalibrationOpsSnapshot();
    if (!snapshot && rows.length > 0) {
      snapshot = buildMarketOpsSnapshot([], rows);
    }

    logInfo(ROUTE_SCOPE, "Market edges served", {
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
    logWarn(ROUTE_SCOPE, "Market edges failed", { message });

    return NextResponse.json(
      { ok: false, error: { message } },
      { status: 500 }
    );
  }
}
