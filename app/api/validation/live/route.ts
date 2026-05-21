import { NextResponse } from "next/server";
import {
  fetchLatestValidationSnapshot,
  fetchRecentValidationMetrics,
  getValidationOpsSnapshot,
} from "@/lib/validation";
import { logInfo, logWarn } from "@/lib/utils/logger";
import type { ValidationLiveApiResponse } from "@/types/validationApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_SCOPE = "api/validation/live";

export async function GET(
  request: Request
): Promise<NextResponse<ValidationLiveApiResponse>> {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "50");

  try {
    const snapshot = getValidationOpsSnapshot();
    const metricsRows = await fetchRecentValidationMetrics(
      Number.isFinite(limit) ? limit : 50
    );
    const latestSnapshotRow = await fetchLatestValidationSnapshot();

    logInfo(ROUTE_SCOPE, "[live-validation] API served", {
      live: snapshot?.matchCount ?? 0,
      trades: snapshot?.lab.tradeCount ?? 0,
      metricsRows: metricsRows.length,
    });

    return NextResponse.json({
      ok: true,
      snapshot,
      lab: snapshot?.lab ?? latestSnapshotRow?.lab_payload ?? null,
      live: snapshot?.live ?? [],
      metricsRows,
      latestSnapshotRow,
      meta: {
        fetchedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - startedAt,
        metricsCount: metricsRows.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logWarn(ROUTE_SCOPE, "[live-validation] API failed", { message });
    return NextResponse.json(
      { ok: false, error: { message } },
      { status: 500 }
    );
  }
}
