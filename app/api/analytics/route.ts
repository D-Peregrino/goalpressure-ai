import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import type { SignalAnalyticsSummary } from "@/lib/analytics/signalAnalytics";
import { loadRecentResolvedSignals } from "@/lib/analytics/loadRecentResolvedSignals";
import { logInfo, logWarn } from "@/lib/utils/logger";
import type {
  AnalyticsApiResponse,
  AnalyticsApiSuccessResponse,
} from "@/types/analyticsApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_SCOPE = "api/analytics";
const SUMMARY_PATH = path.join(
  process.cwd(),
  "data",
  "analytics",
  "analytics-summary.json"
);

async function readAnalyticsSummary(): Promise<SignalAnalyticsSummary | null> {
  try {
    const raw = await readFile(SUMMARY_PATH, "utf8");
    return JSON.parse(raw) as SignalAnalyticsSummary;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as NodeJS.ErrnoException).code)
        : "";
    if (code === "ENOENT") return null;
    throw error;
  }
}

export async function GET(): Promise<NextResponse<AnalyticsApiResponse>> {
  const startedAt = Date.now();

  try {
    const [summary, recentResolved] = await Promise.all([
      readAnalyticsSummary(),
      loadRecentResolvedSignals(),
    ]);

    const signalsProcessed = summary?.totals.totalSignals ?? 0;
    const sourceStatus = summary ? "READY" : "EMPTY";

    const body: AnalyticsApiSuccessResponse = {
      ok: true,
      summary,
      recentResolved,
      meta: {
        signalsProcessed,
        resolvedInTable: recentResolved.length,
        fetchedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - startedAt,
        sourceStatus,
        summaryPath: SUMMARY_PATH,
      },
    };

    logInfo(ROUTE_SCOPE, "Analytics payload served", {
      sourceStatus,
      signalsProcessed,
      resolvedInTable: recentResolved.length,
      hasSummary: Boolean(summary),
    });

    return NextResponse.json(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logWarn(ROUTE_SCOPE, "Analytics read failed", { message });

    return NextResponse.json(
      {
        ok: false,
        error: { message },
        summary: null,
        recentResolved: [],
        meta: {
          fetchedAt: new Date().toISOString(),
          responseTimeMs: Date.now() - startedAt,
          sourceStatus: "ERROR",
        },
      },
      { status: 500 }
    );
  }
}
