import { NextResponse } from "next/server";
import { getSystemHealthReport } from "@/lib/system/systemStatus";
import { logOps } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_SCOPE = "api/health";

export async function GET(): Promise<NextResponse> {
  const report = await getSystemHealthReport();

  const httpStatus =
    report.status === "unhealthy"
      ? 503
      : report.status === "degraded"
        ? 200
        : 200;

  if (process.env.NODE_ENV === "production") {
    logOps(ROUTE_SCOPE, "Health check", {
      status: report.status,
      database: report.database.mode,
      telegram: report.telegram.status,
    });
  }

  return NextResponse.json(
    {
      status: report.status,
      uptime: report.uptime,
      database: report.database,
      telegram: report.telegram,
      liveFeed: report.liveFeed,
      storage: report.storage,
      environment: report.environment,
      timestamp: report.timestamp,
    },
    { status: httpStatus }
  );
}
