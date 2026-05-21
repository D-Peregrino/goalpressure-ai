import type { Match, PressureSnapshot, PressureTrend } from "@/types/domain";
import type {
  PressureLevel,
  PressureScoreResult,
  PressureTriggerReason,
} from "@/types/engine";
import { calculateProductionPressureRaw } from "@/lib/engine/pressure/productionPressureFormula";
import { calculateLiveMomentum } from "@/lib/engine/momentum/liveMomentum";
import {
  computeRollingWindowStats,
  recordMatchTick,
} from "@/lib/engine/pressure/rollingWindow";
import {
  PRESSURE_BENCHMARKS,
  PRESSURE_LEVEL_THRESHOLDS,
  PRESSURE_WEIGHTS,
  ROLLING_WINDOW_MINUTES,
} from "@/lib/engine/pressure/pressureWeights";

const NORMALIZATION_CAP = 120;
import type { SignalConfidence } from "@/types/domain";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalize(value: number, cap: number): number {
  if (cap <= 0) return 0;
  return clamp((value / cap) * 100, 0, 100);
}

export function classifyPressureLevel(score: number): PressureLevel {
  const s = clamp(Math.round(score), 0, 100);
  if (s >= PRESSURE_LEVEL_THRESHOLDS.strongEntry) return "STRONG_ENTRY";
  if (s >= PRESSURE_LEVEL_THRESHOLDS.moderateEntry) return "MODERATE_ENTRY";
  if (s >= PRESSURE_LEVEL_THRESHOLDS.monitor) return "MONITOR";
  return "IGNORE";
}

export function pressureLevelToConfidence(
  level: PressureLevel
): SignalConfidence | null {
  if (level === "STRONG_ENTRY") return "HIGH";
  if (level === "MODERATE_ENTRY") return "MEDIUM";
  return null;
}

function scoreOddsIntensity(over05: number, over15: number): number {
  const implied05 = 1 / clamp(over05, 1.01, 5);
  const implied15 = 1 / clamp(over15, 1.01, 6);
  const blended = (implied05 + implied15) / 2;
  return normalize(blended, 0.55);
}

function scoreOffensiveIntensity(rolling: ReturnType<typeof computeRollingWindowStats>): number {
  return normalize(
    rolling.shots * 2 +
      rolling.shotsOnTarget * 3 +
      rolling.dangerousAttacks * 1.2 +
      rolling.corners,
    35
  );
}

function buildTriggerReasons(
  components: Record<string, number>
): PressureTriggerReason[] {
  return Object.entries(components)
    .map(([code, score]) => ({
      code,
      label: code.replace(/([A-Z])/g, " $1").trim(),
      weight: PRESSURE_WEIGHTS[code as keyof typeof PRESSURE_WEIGHTS] ?? 0,
      score: Math.round(score),
    }))
    .filter((r) => r.score >= 55)
    .sort((a, b) => b.score * b.weight - a.score * a.weight)
    .slice(0, 6);
}

function resolveTrend(previous: number, current: number): PressureTrend {
  const delta = current - previous;
  if (delta >= 2) return "RISING";
  if (delta <= -2) return "FALLING";
  return "STABLE";
}

export interface CalculatePressureOptions {
  previousScore?: number;
  skipTickRecord?: boolean;
}

/**
 * Quantitative offensive pressure score (0–100) with weighted normalization
 * and rolling 10-minute window metrics.
 */
export function calculatePressureScore(
  match: Match,
  options?: CalculatePressureOptions
): PressureScoreResult {
  const production = calculateProductionPressureRaw(match);
  const rolling = computeRollingWindowStats(match);
  const momentum = calculateLiveMomentum(match);

  const components = {
    shotsOnTarget: normalize(
      production.shotsOnTarget,
      PRESSURE_BENCHMARKS.recentShotsOnTarget
    ),
    shots: normalize(match.stats.shots, PRESSURE_BENCHMARKS.recentShots),
    dangerousAttacks: normalize(
      match.stats.dangerousAttacks,
      PRESSURE_BENCHMARKS.recentDangerousAttacks
    ),
    corners: normalize(
      match.stats.corners || rolling.corners,
      PRESSURE_BENCHMARKS.recentCorners
    ),
    xgAccumulated: normalize(production.xG, PRESSURE_BENCHMARKS.xg),
    recentMomentum: normalize(
      momentum.momentumScore,
      PRESSURE_BENCHMARKS.momentum
    ),
    currentOddValue: scoreOddsIntensity(match.odds.over05, match.odds.over15),
    offensiveIntensity: scoreOffensiveIntensity(rolling),
    productionRaw: normalize(production.raw, NORMALIZATION_CAP),
  };

  const score = production.score;
  const level = classifyPressureLevel(score);
  const confidence = pressureLevelToConfidence(level);
  const triggerReasons = buildTriggerReasons(components);

  if (!options?.skipTickRecord) {
    recordMatchTick(match.id, match.minute, match.stats, score);
  }

  return {
    score,
    confidence,
    level,
    triggerReasons,
    components,
    rollingWindowMinutes: rolling.windowMinutes || ROLLING_WINDOW_MINUTES,
  };
}

/** Applies pressure snapshot onto match for ingest / API responses. */
export function applyPressureResultToMatch(
  match: Match,
  result: PressureScoreResult,
  options?: { previousScore?: number }
): Match {
  const previous =
    options?.previousScore ?? match.pressure?.score ?? result.score;
  const trend = resolveTrend(previous, result.score);

  const pressure: PressureSnapshot = {
    score: result.score,
    tier:
      result.level === "STRONG_ENTRY"
        ? "high"
        : result.level === "MODERATE_ENTRY" || result.level === "MONITOR"
          ? "medium"
          : "low",
    trend,
    capturedAt: Date.now(),
  };

  return { ...match, pressure };
}
