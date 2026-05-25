import { NextResponse } from "next/server";
import { getAutonomousCoreSnapshot } from "@/lib/autonomous/autonomousSnapshotStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/autonomous/core — snapshot do núcleo autônomo.
 */
export async function GET() {
  const snapshot = getAutonomousCoreSnapshot();

  return NextResponse.json({
    ok: true,
    snapshot: snapshot ?? {
      generatedAt: new Date().toISOString(),
      dominantRegime: "CALM_MARKET",
      sensitivity: "BALANCED",
      aggressionMode: "NORMAL",
      activeThresholds: {
        minPressureScore: 62,
        minEvPercent: 3.5,
        minConfidence: 48,
        minUrgencyScore: 42,
      },
      avgFalsePositiveRisk: 0,
      autonomousConfidence: 0,
      selfCalibration: [],
      alerts: [],
      profilesByFixture: {},
    },
  });
}
