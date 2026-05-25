import type { Match } from "@/types/domain";
import type { MomentumClassification } from "@/lib/engine/pressure/pressure.types";
import { computeRollingWindowStats } from "@/lib/engine/pressure/rollingWindow";
import { getPressureScoreHistory } from "@/lib/engine/pressure/rollingWindow";

const BENCHMARK_BURST = 40;

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function normalize(value: number, cap: number): number {
  if (cap <= 0) return 0;
  return clamp((value / cap) * 100);
}

export function classifyMomentum(score: number): MomentumClassification {
  const s = clamp(score);
  if (s >= 80) return "EXPLOSIVE";
  if (s >= 60) return "STRONG";
  if (s >= 40) return "GROWING";
  return "WEAK";
}

export function momentumClassLabel(c: MomentumClassification): string {
  switch (c) {
    case "EXPLOSIVE":
      return "Explosivo";
    case "STRONG":
      return "Forte";
    case "GROWING":
      return "Crescendo";
    default:
      return "Fraco";
  }
}

/**
 * Ritmo ofensivo recente (0–100): sequência, finalizações, pressão contínua.
 */
export function calculateMomentum(
  match: Match,
  pressureScore: number,
  accelerationScore: number
): { score: number; classification: MomentumClassification } {
  const rolling = computeRollingWindowStats(match);
  const history = getPressureScoreHistory(match.id);

  const burst = clamp(
    rolling.shotsOnTarget * 3.2 +
      rolling.dangerousAttacks * 1.4 +
      rolling.shots * 0.9 +
      rolling.corners * 1.1,
    0,
    BENCHMARK_BURST
  );

  const burstNorm = normalize(burst, BENCHMARK_BURST);
  const pressureGrowth =
    history.length >= 2
      ? Math.max(0, history[history.length - 1] - history[history.length - 2])
      : match.pressure.trend === "RISING"
        ? 6
        : 0;
  const growthNorm = normalize(pressureGrowth, 15);

  const score = clamp(
    burstNorm * 0.38 +
      growthNorm * 0.22 +
      accelerationScore * 0.25 +
      pressureScore * 0.15
  );

  return { score, classification: classifyMomentum(score) };
}
