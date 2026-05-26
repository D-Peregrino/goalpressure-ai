import { NextResponse } from "next/server";
import { getGpiRecentAlerts, getGpiSnapshot } from "@/lib/gpi/gpiSnapshotStore";
import { getGpiConfig } from "@/lib/gpi/gpiConfig";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/gpi/live — snapshot do GoalPressure Index ao vivo.
 */
export async function GET() {
  const config = getGpiConfig();
  const snapshot = getGpiSnapshot();

  return NextResponse.json({
    ok: true,
    enabled: config.enabled,
    sandboxMode: config.sandbox,
    snapshot: snapshot ?? {
      generatedAt: new Date().toISOString(),
      enabled: config.enabled,
      sandboxMode: config.sandbox,
      readings: [],
      topFixture: null,
      alertsTriggered: 0,
      metrics: { fixturesTracked: 0, avgScore: 0, highGpiCount: 0 },
    },
    recentAlerts: getGpiRecentAlerts(),
  });
}
