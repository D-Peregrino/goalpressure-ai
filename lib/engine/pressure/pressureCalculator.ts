import type { Match, PressureSnapshot, PressureTrend } from "@/types/domain";
import type {
  PressureLevel,
  PressureScoreResult,
  PressureTriggerReason,
} from "@/types/engine";
import {
  applyOffensivePressureToMatch,
  runOffensivePressureEngine,
} from "@/lib/engine/pressure/runOffensivePressureEngine";
import { classifyPressure } from "@/lib/engine/pressure/classifyPressure";
import { PRESSURE_MODEL_WEIGHTS } from "@/lib/engine/pressure/calculatePressureScore";
import { calculateLiveMomentum } from "@/lib/engine/momentum/liveMomentum";
import { computeRollingWindowStats } from "@/lib/engine/pressure/rollingWindow";
import { ROLLING_WINDOW_MINUTES } from "@/lib/engine/pressure/pressureWeights";
import type { SignalConfidence } from "@/types/domain";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function classifyPressureLevel(score: number): PressureLevel {
  const s = clamp(Math.round(score), 0, 100);
  if (s >= 75) return "STRONG_ENTRY";
  if (s >= 60) return "MODERATE_ENTRY";
  if (s >= 40) return "MONITOR";
  return "IGNORE";
}

export function pressureLevelToConfidence(
  level: PressureLevel
): SignalConfidence | null {
  if (level === "STRONG_ENTRY") return "HIGH";
  if (level === "MODERATE_ENTRY") return "MEDIUM";
  return null;
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
 * Facade PressureScoreResult — delega à engine ofensiva modular.
 */
export function calculatePressureScore(
  match: Match,
  options?: CalculatePressureOptions
): PressureScoreResult {
  const offensive = runOffensivePressureEngine(match, {
    previousScore: options?.previousScore,
    skipTickRecord: options?.skipTickRecord,
  });
  const momentum = calculateLiveMomentum(match);
  const rolling = computeRollingWindowStats(match);
  const level = classifyPressureLevel(offensive.pressureScore);
  const classification = classifyPressure(offensive.pressureScore);

  const triggerReasons: PressureTriggerReason[] = Object.entries(
    offensive.components
  )
    .map(([code, score]) => ({
      code,
      label: code,
      weight:
        PRESSURE_MODEL_WEIGHTS[code as keyof typeof PRESSURE_MODEL_WEIGHTS] ?? 0.1,
      score: Math.round(score),
    }))
    .filter((r) => r.score >= 50)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  if (offensive.signals[0]) {
    triggerReasons.unshift({
      code: offensive.signals[0].type,
      label: offensive.signals[0].label,
      weight: 0.2,
      score: offensive.signals[0].strength,
    });
  }

  return {
    score: offensive.pressureScore,
    confidence: pressureLevelToConfidence(level),
    level,
    triggerReasons,
    components: {
      ...offensive.components,
      momentum: offensive.momentumScore,
      territorial: offensive.territorialScore,
      acceleration: offensive.accelerationScore,
      classification: classification === "EXTREME" ? 100 : offensive.pressureScore,
    },
    rollingWindowMinutes: rolling.windowMinutes || ROLLING_WINDOW_MINUTES,
  };
}

export function applyPressureResultToMatch(
  match: Match,
  result: PressureScoreResult,
  options?: { previousScore?: number }
): Match {
  const offensive = runOffensivePressureEngine(match, {
    previousScore: options?.previousScore ?? result.score,
    skipTickRecord: true,
  });
  offensive.pressureScore = result.score;
  return applyOffensivePressureToMatch(match, offensive, options);
}

/** Re-export tier helper for legacy UI. */
export { classificationToTier, classifyPressure } from "@/lib/engine/pressure/classifyPressure";
