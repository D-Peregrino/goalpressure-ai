import { NextResponse } from "next/server";
import { getPlayerOpsSnapshot } from "@/lib/player";
import { fetchRecentPlayerRuntimeMetrics } from "@/lib/player/playerPersistence";
import { logInfo, logWarn } from "@/lib/utils/logger";
import type { PlayerRuntimeApiResponse } from "@/types/playerApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_SCOPE = "api/player/runtime";

export async function GET(request: Request): Promise<NextResponse<PlayerRuntimeApiResponse>> {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");

  try {
    const snapshot = getPlayerOpsSnapshot();
    const rows = await fetchRecentPlayerRuntimeMetrics(
      Number.isFinite(limit) ? limit : 50
    );

    logInfo(ROUTE_SCOPE, "Player runtime served", {
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
    logWarn(ROUTE_SCOPE, "Player runtime failed", { message });

    return NextResponse.json(
      { ok: false, error: { message } },
      { status: 500 }
    );
  }
}
