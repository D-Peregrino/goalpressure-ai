import { NextResponse } from "next/server";
import { getDataQualityOpsSnapshot } from "@/lib/dataQuality";
import { fetchRecentDataQualityMetrics } from "@/lib/dataQuality/dataQualityPersistence";
import { logInfo, logWarn } from "@/lib/utils/logger";
import type { DataQualityLiveApiResponse } from "@/types/dataQualityApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_SCOPE = "api/data-quality/live";

export async function GET(
  request: Request
): Promise<NextResponse<DataQualityLiveApiResponse>> {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");

  try {
    const snapshot = getDataQualityOpsSnapshot();
    const rows = await fetchRecentDataQualityMetrics(
      Number.isFinite(limit) ? limit : 50
    );

    logInfo(ROUTE_SCOPE, "Data quality live served", {
      live: snapshot?.matchCount ?? 0,
      rows: rows.length,
    });

    return NextResponse.json({
      ok: true,
      snapshot,
      live: snapshot?.live ?? [],
      rows,
      meta: {
        fetchedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - startedAt,
        count: rows.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logWarn(ROUTE_SCOPE, "Data quality live failed", { message });
    return NextResponse.json(
      { ok: false, error: { message } },
      { status: 500 }
    );
  }
}
