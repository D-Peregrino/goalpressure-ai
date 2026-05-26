import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { evaluateMatchContext } from "@/components/terminal/intelligence/ContextEngine";
import { getAutonomousAlertSnapshot } from "@/lib/autonomous/autonomousAlertSnapshotStore";
import { getAdaptiveLearningSnapshot } from "@/lib/learning/adaptiveLearningSnapshotStore";
import { getPredictiveSnapshot } from "@/lib/predictive/predictiveSnapshotStore";
import {
  classifyGPI,
  getClassificationLabel,
  intensityFromScore,
} from "@/lib/gpi/gpiClassification";
import {
  computeGpiTrend,
  pushGpiHistory,
} from "@/lib/gpi/gpiHistory";
import { buildGpiNarrative, trendLabel } from "@/lib/gpi/gpiNarratives";
import { GPI_RISK_PENALTY_MAX, GPI_WEIGHTS } from "@/lib/gpi/gpiWeights";
import type { GPIBreakdown, GPIResult } from "@/lib/gpi/gpi.types";
import { evaluatePredictiveFromEnriched } from "@/lib/predictive/predictiveEvaluate";

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normPressure(score: number): number {
  return clamp100(score);
}

function normMomentum(m: number): number {
  return clamp100(Math.abs(m));
}

function normEv(edge: number | null, ev: number | null): number {
  const pct = edge != null && edge < 30 ? edge : (ev != null ? ev * 100 : 0);
  return clamp100(Math.min(18, Math.max(0, pct)) * (100 / 18));
}

function autonomousPriorityScore(match: EnrichedLiveMatch): number {
  const snap = getAutonomousAlertSnapshot();
  const recent = snap?.recentAlerts.find((a) => a.fixtureId === match.fixtureId);
  if (!recent) return 40;
  const map = { baixa: 45, moderada: 58, alta: 72, critica: 88 } as const;
  return map[recent.priority] ?? 50;
}

function adaptiveConfidenceScore(): number {
  const snap = getAdaptiveLearningSnapshot();
  if (!snap) return 52;
  const blend =
    snap.contextualAccuracyPct * 0.45 +
    snap.predictiveAccuracyPct * 0.35 +
    (100 - snap.falsePositivePct) * 0.2;
  return clamp100(blend);
}

function computeRiskPenalty(match: EnrichedLiveMatch, contextScore: number): number {
  const chaos = match.chaosIndex ?? 0;
  const lowConf = match.lowConfidence ? 8 : 0;
  const fp = match.autonomousFalsePositiveRisk ?? 0;
  const raw = chaos * 0.08 + lowConf + fp * 0.12 + (contextScore < 40 ? 4 : 0);
  return Math.min(GPI_RISK_PENALTY_MAX, raw);
}

export function buildGpiBreakdown(match: EnrichedLiveMatch): GPIBreakdown {
  const context = evaluateMatchContext(match);
  const predictive =
    getPredictiveSnapshot()?.readings.find((r) => r.fixtureId === match.fixtureId) ??
    evaluatePredictiveFromEnriched(match);

  const pressure = normPressure(match.pressureScore);
  const momentum = normMomentum(match.sportmonksMomentum ?? match.momentum);
  const contextual = clamp100(context.score);
  const predictiveScore = clamp100(
    predictive.contextualBreakProbability * 0.55 +
      predictive.goalPressureProbability * 0.25 +
      predictive.offensiveAcceleration * 0.2
  );
  const ev = normEv(match.edgePercent, match.ev);
  const adaptive = adaptiveConfidenceScore();
  const autonomous = autonomousPriorityScore(match);
  const territorial = clamp100(
    match.engineTerritorialScore ?? match.pressureScore * 0.85
  );
  const risk = computeRiskPenalty(match, context.score);

  return {
    pressure,
    momentum,
    contextual,
    predictive: predictiveScore,
    ev,
    adaptive,
    autonomous,
    territorial,
    risk,
  };
}

export function calculateGPI(match: EnrichedLiveMatch): GPIResult {
  const b = buildGpiBreakdown(match);
  const w = GPI_WEIGHTS;

  const weighted =
    b.pressure * w.pressure +
    b.momentum * w.momentum +
    b.contextual * w.contextual +
    b.predictive * w.predictive +
    b.ev * w.ev +
    b.adaptive * w.adaptive +
    b.autonomous * w.autonomous +
    b.territorial * w.territorial;

  const score = clamp100(weighted - b.risk * 0.65);

  const predictiveReading =
    getPredictiveSnapshot()?.readings.find((r) => r.fixtureId === match.fixtureId) ??
    evaluatePredictiveFromEnriched(match);

  const predictiveBoost =
    predictiveReading.level === "ruptura_iminente" ||
    predictiveReading.level === "pre_ruptura";

  const classification = classifyGPI(score, predictiveBoost);
  const minute = Math.max(0, match.minute ?? 0);

  pushGpiHistory(match.fixtureId, minute, score);
  const { trend, delta } = computeGpiTrend(match.fixtureId);

  const pressureFalling =
    trend === "caindo" && delta <= -8 && match.pressureScore < 58;

  const narrative = buildGpiNarrative({
    classification,
    trend,
    marketLagActive: predictiveReading.marketLagActive,
    pressureFalling,
  });

  return {
    fixtureId: match.fixtureId,
    matchId: match.matchId,
    matchLabel: `${match.homeTeam} x ${match.awayTeam}`,
    league: match.league,
    minute,
    score,
    classification,
    classificationLabel: getClassificationLabel(classification),
    narrative,
    intensity: intensityFromScore(score),
    trend,
    trendLabel: trendLabel(trend),
    breakdown: b,
    generatedAt: new Date().toISOString(),
  };
}
