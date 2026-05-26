import type { Match } from "@/types/domain";
import { getAutonomousAlertSnapshot } from "@/lib/autonomous/autonomousAlertSnapshotStore";
import { getDispatchSnapshot } from "@/lib/execution/dispatchSnapshotStore";
import { loadHistoricalOutcomes } from "@/lib/engine/learning/loadHistoricalOutcomes";
import { getLearningSnapshot } from "@/lib/engine/learning/learningSnapshotStore";
import { getPredictiveSnapshot } from "@/lib/predictive/predictiveSnapshotStore";
import {
  getAdaptiveLearningConfig,
  isAdaptiveLearningEnabled,
} from "@/lib/learning/adaptiveLearningConfig";
import { logAdaptiveLearningEvent } from "@/lib/learning/adaptiveLearningLogger";
import { setAdaptiveLearningSnapshot } from "@/lib/learning/adaptiveLearningSnapshotStore";
import type { AdaptiveLearningSnapshot } from "@/lib/learning/adaptiveLearning.types";
import {
  getContextualAccuracyPct,
  getLearningTimeline,
  getPredictiveAccuracyPct,
  getReadingsRecorded,
  getValidAnticipations,
  ingestDispatchContextual,
  ingestEngineLearningHitRate,
  ingestPredictiveSnapshot,
  pushTimelinePoint,
} from "@/lib/learning/contextualAccuracy";
import {
  getFalsePositivePct,
  getMarketLagConfirmedPct,
  ingestAutonomousMetrics,
  ingestPredictiveMetrics,
  recordMarketLagSignal,
} from "@/lib/learning/falsePositiveTracker";
import {
  getTopLeagueReliability,
  ingestLeagueFromLiveMatch,
  ingestLeagueFromOutcome,
  leagueReliabilityCount,
} from "@/lib/learning/leagueReliability";
import {
  getStrongPatterns,
  ingestOutcomePatterns,
  patternMemoryCount,
  recordPatternObservation,
} from "@/lib/learning/patternMemory";
import { getAdaptiveThresholds, getRecentAdjustments, runSelfCalibration } from "@/lib/learning/selfCalibration";

function isLive(match: Match): boolean {
  return match.status === "LIVE" || match.status === "HALFTIME";
}

/**
 * Ciclo de aprendizado adaptativo — consome snapshots e histórico sem alterar engines.
 */
export async function runAdaptiveLearningCycle(
  matches: Match[]
): Promise<AdaptiveLearningSnapshot | null> {
  const config = getAdaptiveLearningConfig();
  if (!config.enabled) return null;

  const outcomes = await loadHistoricalOutcomes();
  for (const o of outcomes) {
    ingestLeagueFromOutcome(o);
    ingestOutcomePatterns(o.league, o.pressureScore, o.outcome === "HIT");
  }

  const engineLearning = getLearningSnapshot();
  if (engineLearning) {
    ingestEngineLearningHitRate(
      engineLearning.accuracy.hitRate,
      engineLearning.accuracy.totalResolved
    );
  }

  const predictive = getPredictiveSnapshot();
  if (predictive) {
    ingestPredictiveMetrics(
      predictive.metrics.falsePositives,
      predictive.metrics.validAnticipations
    );
    ingestPredictiveSnapshot(
      predictive.metrics.contextualHits,
      predictive.metrics.predictiveReadings,
      predictive.metrics.validAnticipations,
      predictive.metrics.falsePositives
    );
    for (const r of predictive.readings) {
      if (r.marketLagActive) {
        recordMarketLagSignal(r.contextualBreakProbability >= 60);
      }
    }
  }

  const alerts = getAutonomousAlertSnapshot();
  if (alerts) {
    ingestAutonomousMetrics(alerts.metrics.alertsBlocked, alerts.metrics.alertsSent);
  }

  const dispatch = getDispatchSnapshot();
  if (dispatch) {
    ingestDispatchContextual(dispatch.feed.length, dispatch.criticalCount);
  }

  const live = matches.filter(isLive);
  let chaotic = 0;
  for (const m of live) {
    ingestLeagueFromLiveMatch(m);
    recordPatternObservation(m);
    if ((m.chaosIndex ?? 0) >= 60) chaotic += 1;
  }

  const chaoticShare = live.length > 0 ? chaotic / live.length : 0;
  const thresholds = runSelfCalibration({
    contextualAccuracyPct: getContextualAccuracyPct(),
    predictiveAccuracyPct: getPredictiveAccuracyPct(),
    falsePositivePct: getFalsePositivePct(),
    chaoticLeagueShare: chaoticShare,
  });

  pushTimelinePoint();

  const snapshot: AdaptiveLearningSnapshot = {
    generatedAt: new Date().toISOString(),
    contextualAccuracyPct: getContextualAccuracyPct(),
    predictiveAccuracyPct: getPredictiveAccuracyPct(),
    validAnticipations: getValidAnticipations(),
    falsePositivePct: getFalsePositivePct(),
    marketLagConfirmedPct: getMarketLagConfirmedPct(),
    strongPatterns: getStrongPatterns(),
    topLeagues: getTopLeagueReliability(),
    thresholds,
    recentAdjustments: getRecentAdjustments(),
    timeline: getLearningTimeline(),
    metrics: {
      readingsRecorded: getReadingsRecorded(),
      patternsTracked: patternMemoryCount(),
      leaguesTracked: leagueReliabilityCount(),
      enabled: config.enabled,
      sandboxMode: config.sandbox,
    },
  };

  setAdaptiveLearningSnapshot(snapshot);

  await logAdaptiveLearningEvent({
    event: config.sandbox ? "sandbox_cycle" : "cycle",
    contextualPct: snapshot.contextualAccuracyPct,
    predictivePct: snapshot.predictiveAccuracyPct,
    patterns: snapshot.strongPatterns.length,
  });

  return snapshot;
}

export { isAdaptiveLearningEnabled, getAdaptiveThresholds };
