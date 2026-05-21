import { NextResponse } from "next/server";
import { getTemporalOpsSnapshot } from "@/lib/temporal";
import { fetchRecentTemporalMetrics } from "@/lib/temporal/temporalPersistence";
import { logInfo, logWarn } from "@/lib/utils/logger";
import type { TemporalLiveApiResponse } from "@/types/temporalApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_SCOPE = "api/temporal/live";

export async function GET(request: Request): Promise<NextResponse<TemporalLiveApiResponse>> {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");

  try {
    const snapshot = getTemporalOpsSnapshot();
    const rows = await fetchRecentTemporalMetrics(
      Number.isFinite(limit) ? limit : 50
    );

    logInfo(ROUTE_SCOPE, "Temporal live served", {
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
    logWarn(ROUTE_SCOPE, "Temporal live failed", { message });

    return NextResponse.json(
      { ok: false, error: { message } },
      { status: 500 }
    );
  }
}
