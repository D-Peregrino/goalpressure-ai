import { NextResponse } from "next/server";
import { getMicroeventOpsSnapshot } from "@/lib/microevent";
import { fetchRecentMicroeventMetrics } from "@/lib/microevent/microeventPersistence";
import { logInfo, logWarn } from "@/lib/utils/logger";
import type { MicroeventLiveApiResponse } from "@/types/microeventApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_SCOPE = "api/microevent/live";

export async function GET(
  request: Request
): Promise<NextResponse<MicroeventLiveApiResponse>> {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");

  try {
    const snapshot = getMicroeventOpsSnapshot();
    const rows = await fetchRecentMicroeventMetrics(
      Number.isFinite(limit) ? limit : 50
    );

    logInfo(ROUTE_SCOPE, "Microevent live served", {
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
    logWarn(ROUTE_SCOPE, "Microevent live failed", { message });

    return NextResponse.json(
      { ok: false, error: { message } },
      { status: 500 }
    );
  }
}
