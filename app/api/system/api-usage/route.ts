import { NextResponse } from "next/server";
import {
  buildApiUsageSnapshot,
  getMonthlyQuota,
} from "@/lib/api/apiUsageMonitor";
import { fetchRecentApiUsageMetrics } from "@/lib/api/apiUsagePersistence";
import { logInfo, logWarn } from "@/lib/utils/logger";
import type { ApiUsageApiResponse } from "@/types/apiUsageApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_SCOPE = "api/system/api-usage";

export async function GET(
  request: Request
): Promise<NextResponse<ApiUsageApiResponse>> {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "48");

  try {
    const snapshot = buildApiUsageSnapshot();
    const rows = await fetchRecentApiUsageMetrics(
      Number.isFinite(limit) ? limit : 48
    );

    logInfo(ROUTE_SCOPE, "[api-usage] API served", {
      alert: snapshot.alertLevel,
      rpm: snapshot.requestsPerMinute,
      projection: snapshot.requestsMonthProjection,
    });

    return NextResponse.json({
      ok: true,
      snapshot,
      rows,
      meta: {
        fetchedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - startedAt,
        monthlyQuota: getMonthlyQuota(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logWarn(ROUTE_SCOPE, "[api-usage] API failed", { message });
    return NextResponse.json(
      { ok: false, error: { message } },
      { status: 500 }
    );
  }
}
