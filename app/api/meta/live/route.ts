import { NextResponse } from "next/server";
import { getMetaOpsSnapshot } from "@/lib/meta";
import { fetchRecentMetaConsensusMetrics } from "@/lib/meta/metaPersistence";
import { logInfo, logWarn } from "@/lib/utils/logger";
import type { MetaLiveApiResponse } from "@/types/metaApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_SCOPE = "api/meta/live";

export async function GET(
  request: Request
): Promise<NextResponse<MetaLiveApiResponse>> {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");

  try {
    const snapshot = getMetaOpsSnapshot();
    const rows = await fetchRecentMetaConsensusMetrics(
      Number.isFinite(limit) ? limit : 50
    );

    logInfo(ROUTE_SCOPE, "Meta live served", {
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
    logWarn(ROUTE_SCOPE, "Meta live failed", { message });

    return NextResponse.json(
      { ok: false, error: { message } },
      { status: 500 }
    );
  }
}
