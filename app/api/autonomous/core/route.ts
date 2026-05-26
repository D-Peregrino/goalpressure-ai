import { NextResponse } from "next/server";
import { getAutonomousCoreSnapshot } from "@/lib/autonomous/autonomousSnapshotStore";
import { getAutonomousAlertSnapshot } from "@/lib/autonomous/autonomousAlertSnapshotStore";
import { getPredictiveSnapshot } from "@/lib/predictive/predictiveSnapshotStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/autonomous/core — snapshot do núcleo autônomo.
 */
export async function GET() {
  const snapshot = getAutonomousCoreSnapshot();

  const alertEngine = getAutonomousAlertSnapshot();
  const predictiveEngine = getPredictiveSnapshot();

  return NextResponse.json({
    ok: true,
    alertEngine,
    predictiveEngine,
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
