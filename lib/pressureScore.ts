/**
 * GoalPressure AI — Pressure Score (facade)
 * Delegates to lib/engine/pressure/pressureCalculator (quantitative live engine).
 */

import type { Match, PressureSnapshot, PressureTier, PressureTrend } from "@/types/domain";
import {
  applyPressureResultToMatch,
  calculatePressureScore as calculateEnginePressure,
} from "@/lib/engine/pressure/pressureCalculator";

export interface CalculatePressureOptions {
  previousScore?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Tier from pressure score (UI bands).
 * 0–59 → low · 60–79 → medium · 80–100 → high
 */
export function getPressureTier(score: number): PressureTier {
  const s = clamp(Math.round(score), 0, 100);
  if (s >= 80) return "high";
  if (s >= 60) return "medium";
  return "low";
}

export function getPressureTrend(
  previousScore: number,
  currentScore: number
): PressureTrend {
  const delta = currentScore - previousScore;
  if (delta >= 2) return "RISING";
  if (delta <= -2) return "FALLING";
  return "STABLE";
}

/** Computes offensive pressure snapshot for a match (engine-backed). */
export function calculatePressureScore(
  match: Match,
  options?: CalculatePressureOptions
): PressureSnapshot {
  const result = calculateEnginePressure(match, {
    previousScore: options?.previousScore,
  });

  const previous =
    options?.previousScore ?? match.pressure?.score ?? result.score;
  const trend = getPressureTrend(previous, result.score);

  return {
    score: result.score,
    tier: getPressureTier(result.score),
    trend,
    capturedAt: Date.now(),
  };
}

/** Recomputes pressure on an existing match (ingest, mock seed, live tick). */
export function applyPressureToMatch(
  match: Match,
  options?: CalculatePressureOptions
): Match {
  const result = calculateEnginePressure(match, {
    previousScore: options?.previousScore,
  });
  return applyPressureResultToMatch(match, result, options);
}
