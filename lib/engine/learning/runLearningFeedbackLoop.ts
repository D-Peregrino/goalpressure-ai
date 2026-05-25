import { loadHistoricalOutcomes } from "@/lib/engine/learning/loadHistoricalOutcomes";
import { calculateSignalAccuracy } from "@/lib/engine/learning/calculateSignalAccuracy";
import { detectRecurringPatterns } from "@/lib/engine/learning/detectRecurringPatterns";
import { calculateLeagueBehavior } from "@/lib/engine/learning/calculateLeagueBehavior";
import { detectTeamProfiles } from "@/lib/engine/learning/detectTeamProfiles";
import { detectLateGoalPatterns } from "@/lib/engine/learning/detectLateGoalPatterns";
import { calibratePressureWeights } from "@/lib/engine/learning/calibratePressureWeights";
import {
  persistLeagueProfiles,
  persistTeamProfiles,
  persistWeightRecommendation,
} from "@/lib/engine/learning/learningPersistence";
import { setLearningSnapshot } from "@/lib/engine/learning/learningSnapshotStore";
import type { LearningDashboardSnapshot } from "@/lib/engine/learning/learning.types";
import { logLearningMetric } from "@/lib/engine/learning/learningLogger";
import { logInfo } from "@/lib/utils/logger";

const LOG_SCOPE = "learning-feedback-loop";

let refreshInFlight: Promise<LearningDashboardSnapshot | null> | null = null;

/**
 * Recalcula agregados históricos (assíncrono, pós-jogo).
 */
export async function runLearningFeedbackLoop(): Promise<LearningDashboardSnapshot | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const outcomes = await loadHistoricalOutcomes();
    const accuracy = calculateSignalAccuracy(outcomes);
    const patterns = detectRecurringPatterns(outcomes);
    const leagues = calculateLeagueBehavior(outcomes);
    const teams = detectTeamProfiles(outcomes);
    const lateGoal = detectLateGoalPatterns(outcomes);
    const weightRecommendation = calibratePressureWeights(outcomes);

    const highP = outcomes.filter(
      (o) => o.pressureScore >= 70 && (o.outcome === "HIT" || o.outcome === "MISS")
    );
    const falsePositiveRate =
      highP.length > 0
        ? Math.round(
            (highP.filter((o) => o.outcome === "MISS").length / highP.length) * 1000
          ) / 10
        : 0;

    const topMarkets = Object.entries(accuracy.byMarket)
      .map(([market, b]) => ({
        market,
        roi: b.roi,
        hitRate: b.hitRate,
        count: b.total,
      }))
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 5);

    const snapshot: LearningDashboardSnapshot = {
      generatedAt: new Date().toISOString(),
      accuracy,
      patterns,
      leagues: leagues.slice(0, 10),
      teams: teams.slice(0, 12),
      weightRecommendation,
      lateGoal,
      topMarkets,
      falsePositiveRate,
    };

    setLearningSnapshot(snapshot);

    void persistLeagueProfiles(leagues);
    void persistTeamProfiles(teams);
    if (weightRecommendation) void persistWeightRecommendation(weightRecommendation);

    logLearningMetric({
      accuracy: accuracy.hitRate,
      roi: accuracy.roiTotal,
      pattern: patterns[0]?.type,
      recommendation: weightRecommendation ? "weights_suggested" : "none",
    });

    logInfo(LOG_SCOPE, "Learning feedback loop complete", {
      outcomes: outcomes.length,
      hitRate: accuracy.hitRate,
      patterns: patterns.length,
      leagues: leagues.length,
    });

    return snapshot;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

export function scheduleLearningFeedbackLoop(): void {
  void runLearningFeedbackLoop().catch(() => {
    /* non-blocking */
  });
}
