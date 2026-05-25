import { NextResponse } from "next/server";
import { runLearningFeedbackLoop } from "@/lib/engine/learning/runLearningFeedbackLoop";
import {
  getLearningSnapshot,
  isLearningCacheStale,
} from "@/lib/engine/learning/learningSnapshotStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/learning/dashboard — snapshot agregado da Learning Engine.
 */
export async function GET() {
  let snapshot = getLearningSnapshot();
  if (!snapshot || isLearningCacheStale()) {
    snapshot = await runLearningFeedbackLoop();
  }

  return NextResponse.json({
    ok: true,
    snapshot: snapshot ?? {
      generatedAt: new Date().toISOString(),
      accuracy: {
        totalResolved: 0,
        hitRate: 0,
        roiTotal: 0,
        roiAverage: 0,
        realizedEvAverage: 0,
        byMarket: {},
        byPressureBand: {},
        byTemperature: {},
      },
      patterns: [],
      leagues: [],
      teams: [],
      weightRecommendation: null,
      lateGoal: {
        latePressureHitRate: 0,
        minute70PlusSignals: 0,
        accelerationImpact: 0,
        scorelineImpact: {},
        description: "Sem dados históricos suficientes.",
      },
      topMarkets: [],
      falsePositiveRate: 0,
    },
  });
}
