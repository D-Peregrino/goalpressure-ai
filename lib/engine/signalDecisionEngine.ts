/**
 * GoalPressure AI — Signal Decision Engine (EV+).
 * Transforma métricas do Pressure Engine em oportunidades de sinal quantitativas.
 */

import type { Match, MarketType } from "@/types/domain";
import { getMatchLabel } from "@/types/domain";
import { getTemporalDynamicsForFixture } from "@/lib/temporal/temporalSnapshot";
import { temporalUrgencyBoost } from "@/lib/temporal/temporalDynamicsEngine";

// ─── Thresholds (todas obrigatórias para shouldTrigger) ───────────────────────

export const SIGNAL_DECISION_THRESHOLDS = {
  minPressureScore: 72,
  minMomentum: 18,
  minGoalProbability: 0.58,
  minConfidence: 0.65,
  minEv: 0,
} as const;

export const SIGNAL_COOLDOWN_MS = 5 * 60_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SignalDecisionMetrics {
  pressureScore: number;
  momentum: number;
  goalProbability: number;
  confidence: number;
}

export interface SignalOpportunityEvaluation {
  shouldTrigger: boolean;
  market: string;
  confidence: number;
  ev: number;
  fairOdd: number;
  currentOdd: number;
  reason: string[];
  urgency: number;
}

interface MarketCandidate {
  market: MarketType;
  currentOdd: number;
  fairProbability: number;
  ev: number;
  fairOdd: number;
  reasons: string[];
  urgency: number;
}

// ─── Cooldown / dedup (5 min por fixture + market) ──────────────────────────

const recentDispatches = new Map<string, number>();

function fixtureKey(match: Match): string {
  return match.externalId ?? match.id.replace(/^sm-/, "") ?? match.id;
}

function cooldownFingerprint(fixtureId: string, market: string): string {
  return `${fixtureId}|${market}`;
}

export function isSignalOnCooldown(fixtureId: string, market: string): boolean {
  const key = cooldownFingerprint(fixtureId, market);
  const last = recentDispatches.get(key);
  if (!last) return false;
  return Date.now() - last < SIGNAL_COOLDOWN_MS;
}

export function markSignalDispatchCooldown(fixtureId: string, market: string): void {
  recentDispatches.set(cooldownFingerprint(fixtureId, market), Date.now());
  if (recentDispatches.size > 1000) {
    const cutoff = Date.now() - SIGNAL_COOLDOWN_MS * 3;
    for (const [k, ts] of recentDispatches.entries()) {
      if (ts < cutoff) recentDispatches.delete(k);
    }
  }
}

export function getSignalCooldownEntries(): number {
  const cutoff = Date.now() - SIGNAL_COOLDOWN_MS;
  let n = 0;
  for (const ts of recentDispatches.values()) {
    if (ts >= cutoff) n += 1;
  }
  return n;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function passesCoreGates(metrics: SignalDecisionMetrics): boolean {
  return (
    metrics.pressureScore >= SIGNAL_DECISION_THRESHOLDS.minPressureScore &&
    metrics.momentum >= SIGNAL_DECISION_THRESHOLDS.minMomentum &&
    metrics.goalProbability >= SIGNAL_DECISION_THRESHOLDS.minGoalProbability &&
    metrics.confidence >= SIGNAL_DECISION_THRESHOLDS.minConfidence
  );
}

function computeFairProbability(
  market: MarketType,
  metrics: SignalDecisionMetrics,
  match: Match
): number {
  const base = metrics.goalProbability;
  if (market === "OVER_0_5") {
    return clamp(base * 1.08 + metrics.pressureScore / 1000, 0.55, 0.92);
  }
  const xg = match.stats.xG ?? 0;
  return clamp(
    base * 0.72 + (metrics.pressureScore / 100) * 0.12 + xg * 0.06,
    0.35,
    0.88
  );
}

function computeEv(fairProbability: number, currentOdd: number): number {
  const odd = clamp(currentOdd, 1.01, 25);
  return round3(fairProbability * odd - 1);
}

function computeUrgency(
  match: Match,
  metrics: SignalDecisionMetrics,
  ev: number
): number {
  const minuteUrgency =
    match.minute >= 70 && match.minute <= 85
      ? 90
      : match.minute >= 55
        ? 75
        : match.minute >= 35
          ? 60
          : 45;
  const evBoost = clamp(ev * 40, 0, 25);
  const momentumBoost = clamp(metrics.momentum * 0.35, 0, 20);
  return Math.round(clamp(minuteUrgency + evBoost + momentumBoost, 0, 100));
}

function buildOver05Candidate(
  match: Match,
  metrics: SignalDecisionMetrics
): MarketCandidate | null {
  if (match.minute < 20 || match.minute > 80) return null;
  const currentOdd = match.odds.over05;
  if (currentOdd < 1.5) return null;

  const fairProbability = computeFairProbability("OVER_0_5", metrics, match);
  const ev = computeEv(fairProbability, currentOdd);
  const fairOdd = round2(1 / fairProbability);

  return {
    market: "OVER_0_5",
    currentOdd,
    fairProbability,
    ev,
    fairOdd,
    reasons: [
      `P${metrics.pressureScore}≥72`,
      `M${metrics.momentum}≥18`,
      `GP${(metrics.goalProbability * 100).toFixed(0)}%`,
      `EV+${(ev * 100).toFixed(1)}%`,
    ],
    urgency: computeUrgency(match, metrics, ev),
  };
}

function buildOver15Candidate(
  match: Match,
  metrics: SignalDecisionMetrics
): MarketCandidate | null {
  if (match.minute < 25 || match.minute > 78) return null;
  const currentOdd = match.odds.over15;
  if (currentOdd < 1.4) return null;
  if (match.stats.dangerousAttacks < 18) return null;

  const fairProbability = computeFairProbability("OVER_1_5", metrics, match);
  const ev = computeEv(fairProbability, currentOdd);
  const fairOdd = round2(1 / fairProbability);

  return {
    market: "OVER_1_5",
    currentOdd,
    fairProbability,
    ev,
    fairOdd,
    reasons: [
      `P${metrics.pressureScore}≥72`,
      `DA${match.stats.dangerousAttacks}`,
      `EV+${(ev * 100).toFixed(1)}%`,
    ],
    urgency: computeUrgency(match, metrics, ev),
  };
}

function pickBestCandidate(candidates: MarketCandidate[]): MarketCandidate | null {
  const evPositive = candidates.filter(
    (c) => c.ev > SIGNAL_DECISION_THRESHOLDS.minEv
  );
  if (evPositive.length === 0) return null;
  return evPositive.sort((a, b) => b.ev - a.ev || b.urgency - a.urgency)[0];
}

function noTrigger(
  market: string,
  reasons: string[]
): SignalOpportunityEvaluation {
  return {
    shouldTrigger: false,
    market,
    confidence: 0,
    ev: 0,
    fairOdd: 0,
    currentOdd: 0,
    reason: reasons,
    urgency: 0,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Avalia oportunidade EV+ para um fixture com métricas do Pressure Engine.
 */
export function evaluateSignalOpportunity(
  match: Match,
  metrics: SignalDecisionMetrics
): SignalOpportunityEvaluation {
  const fixtureId = fixtureKey(match);

  if (!passesCoreGates(metrics)) {
    const reasons: string[] = [];
    if (metrics.pressureScore < SIGNAL_DECISION_THRESHOLDS.minPressureScore) {
      reasons.push(`pressure_${metrics.pressureScore}_below_72`);
    }
    if (metrics.momentum < SIGNAL_DECISION_THRESHOLDS.minMomentum) {
      reasons.push(`momentum_${metrics.momentum}_below_18`);
    }
    if (metrics.goalProbability < SIGNAL_DECISION_THRESHOLDS.minGoalProbability) {
      reasons.push(`goal_p_${metrics.goalProbability.toFixed(2)}_below_0.58`);
    }
    if (metrics.confidence < SIGNAL_DECISION_THRESHOLDS.minConfidence) {
      reasons.push(`confidence_${metrics.confidence.toFixed(2)}_below_0.65`);
    }
    return noTrigger("NONE", reasons);
  }

  const candidates: MarketCandidate[] = [];
  const over05 = buildOver05Candidate(match, metrics);
  if (over05) candidates.push(over05);
  const over15 = buildOver15Candidate(match, metrics);
  if (over15) candidates.push(over15);

  if (candidates.length === 0) {
    return noTrigger("NONE", ["no_market_candidate"]);
  }

  const best = pickBestCandidate(candidates);
  if (!best) {
    return noTrigger(candidates[0].market, ["ev_not_positive"]);
  }

  if (isSignalOnCooldown(fixtureId, best.market)) {
    return {
      shouldTrigger: false,
      market: best.market,
      confidence: metrics.confidence,
      ev: best.ev,
      fairOdd: best.fairOdd,
      currentOdd: best.currentOdd,
      reason: [...best.reasons, "cooldown_active"],
      urgency: best.urgency,
    };
  }

  const blendedConfidence = round3(
    clamp(metrics.confidence * 0.6 + best.fairProbability * 0.4, 0, 1)
  );

  const temporal = getTemporalDynamicsForFixture(fixtureId);
  let urgency = best.urgency;
  const reasons = [
    ...best.reasons,
    getMatchLabel(match),
    `conf_${(blendedConfidence * 100).toFixed(0)}%`,
  ];

  if (temporal) {
    urgency = Math.round(
      clamp(urgency * temporalUrgencyBoost(temporal), 0, 100)
    );
    if (temporal.executionPriority === "CRITICAL") {
      reasons.push(`temporal_${temporal.matchPhase}_CRITICAL`);
    } else if (temporal.executionPriority === "HIGH") {
      reasons.push(`temporal_${temporal.executionPriority}`);
    }
    if (temporal.flags.includes("CHAOS_PHASE")) {
      reasons.push("chaos_phase");
    }
  }

  return {
    shouldTrigger: true,
    market: best.market,
    confidence: blendedConfidence,
    ev: best.ev,
    fairOdd: best.fairOdd,
    currentOdd: best.currentOdd,
    reason: reasons,
    urgency,
  };
}

/** Converte métricas do live runtime para input do decision engine. */
export function metricsFromLiveRecord(record: {
  pressureScore: number;
  momentum: number;
  goalProbability: number;
  confidence: number;
}): SignalDecisionMetrics {
  return {
    pressureScore: record.pressureScore,
    momentum: record.momentum,
    goalProbability: record.goalProbability,
    confidence: record.confidence,
  };
}
