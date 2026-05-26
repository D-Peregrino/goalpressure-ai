import type { Match } from "@/types/domain";
import { evaluateMatchContext } from "@/components/terminal/intelligence/ContextEngine";
import { updateFixtureWatcher } from "@/lib/autonomous/autonomousMatchWatcher";
import { matchToContextMatch } from "@/lib/autonomous/matchContextBridge";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { logPredictiveEvent } from "@/lib/predictive/predictiveLogger";
import { getPredictiveEngineConfig, isPredictiveEngineEnabled } from "@/lib/predictive/predictiveConfig";
import { evaluatePredictiveReading } from "@/lib/predictive/predictiveSignals";
import {
  getPredictiveSnapshot,
  setPredictiveSnapshot,
} from "@/lib/predictive/predictiveSnapshotStore";
import type {
  PredictiveEngineSnapshot,
  PredictiveLevel,
  PredictiveReading,
} from "@/lib/predictive/predictive.types";

const MAX_READINGS = 48;
const recentByFixture = new Map<string, PredictiveLevel>();

let metricsReadings = 0;
let metricsHits = 0;
let metricsFalsePositives = 0;
let metricsValidAnticipations = 0;

function isLive(match: Match): boolean {
  return match.status === "LIVE" || match.status === "HALFTIME";
}

function trackMetrics(reading: PredictiveReading, contextScore: number): void {
  metricsReadings += 1;
  const prev = recentByFixture.get(reading.fixtureId);
  const anticipatory =
    reading.level === "pre_ruptura" || reading.level === "ruptura_iminente";

  if (anticipatory && contextScore >= 68) {
    metricsValidAnticipations += 1;
  }
  if (
    prev &&
    (prev === "pre_ruptura" || prev === "ruptura_iminente") &&
    reading.level === "estavel" &&
    contextScore < 50
  ) {
    metricsFalsePositives += 1;
  }
  if (reading.level !== "estavel" && contextScore >= 70) {
    metricsHits += 1;
  }

  recentByFixture.set(reading.fixtureId, reading.level);
}

export function getPredictiveReadingForFixture(fixtureId: string): PredictiveReading | null {
  return getPredictiveSnapshot()?.readings.find((r) => r.fixtureId === fixtureId) ?? null;
}

export function predictiveBoostsAutonomousPriority(fixtureId: string): {
  boost: boolean;
  level: PredictiveLevel | null;
} {
  const reading = getPredictiveReadingForFixture(fixtureId);
  if (!reading) return { boost: false, level: null };
  const boost =
    reading.level === "ruptura_iminente" ||
    reading.level === "pre_ruptura" ||
    (reading.prePressureActive && reading.marketLagActive);
  return { boost, level: reading.level };
}

/**
 * Ciclo preditivo — chamado após batch live (sem alterar ContextEngine).
 */
export async function runPredictiveMomentumCycle(
  matches: Match[]
): Promise<PredictiveEngineSnapshot> {
  const config = getPredictiveEngineConfig();
  const live = matches.filter(isLive);
  const readings: PredictiveReading[] = [];

  for (const match of live) {
    const ctxMatch = matchToContextMatch(match);
    const context = evaluateMatchContext(ctxMatch);
    const watch = updateFixtureWatcher(match, context.score);
    const reading = evaluatePredictiveReading(ctxMatch as EnrichedLiveMatch, context, watch);
    readings.push(reading);
    trackMetrics(reading, context.score);

    await logPredictiveEvent({
      event: config.sandbox ? "sandbox_reading" : "reading",
      fixtureId: reading.fixtureId,
      level: reading.level,
      goalPressureProbability: reading.goalPressureProbability,
      marketLagScore: reading.marketLagScore,
    });
  }

  readings.sort((a, b) => b.contextualBreakProbability - a.contextualBreakProbability);

  const snapshot: PredictiveEngineSnapshot = {
    generatedAt: new Date().toISOString(),
    readings: readings.slice(0, MAX_READINGS),
    metrics: {
      predictiveReadings: metricsReadings,
      contextualHits: metricsHits,
      falsePositives: metricsFalsePositives,
      validAnticipations: metricsValidAnticipations,
      sandboxMode: config.sandbox,
      enabled: config.enabled,
    },
  };

  setPredictiveSnapshot(snapshot);
  return snapshot;
}

export { isPredictiveEngineEnabled };
