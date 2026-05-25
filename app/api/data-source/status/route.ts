import { NextResponse } from "next/server";
import {
  isSeedAllowed,
  isSeedLiveExplicitlyEnabled,
  isSportmonksTokenConfigured,
  resolveActiveDataSource,
} from "@/lib/data-source/config";
import { getLiveFetchTelemetry } from "@/lib/data-source/telemetry";

export const dynamic = "force-dynamic";

/** GET /api/data-source/status — fonte ativa e último fetch live-matches. */
export async function GET() {
  const t = getLiveFetchTelemetry();

  return NextResponse.json({
    activeSource: resolveActiveDataSource(),
    sportmonksTokenConfigured: isSportmonksTokenConfigured(),
    seedEnabled: isSeedLiveExplicitlyEnabled(),
    seedAllowed: isSeedAllowed(),
    lastFetchAt: t.lastFetchAt,
    lastFetchStatus: t.lastFetchStatus,
    lastFetchEndpoint: t.lastFetchEndpoint,
    matchCount: t.matchCount,
    error: t.error,
    httpStatus: t.httpStatus,
    liveMatchesSource: t.activeSource,
  });
}
