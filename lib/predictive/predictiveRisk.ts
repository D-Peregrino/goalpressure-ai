import type { PredictiveTrendDirection } from "@/lib/predictive/predictive.types";

export interface PredictiveRiskInput {
  pressure: number;
  momentum: number;
  acceleration: number;
  chaosIndex: number;
  homePressure: number;
  awayPressure: number;
  dominantSide: "home" | "away" | "balanced";
  momentumFallingStreak?: number;
  peakPressure?: number;
  marketLagScore: number;
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Risco de colapso defensivo do lado sob pressão. */
export function computeCollapseRisk(input: PredictiveRiskInput): number {
  const unilateral =
    Math.abs(input.homePressure - input.awayPressure) >= 18 &&
    input.pressure >= 70;
  const sustained = input.peakPressure != null && input.peakPressure >= 75 && input.pressure >= 68;
  const adversaryFade = (input.momentumFallingStreak ?? 0) >= 2;

  let score = input.pressure * 0.35 + input.acceleration * 0.25 + input.chaosIndex * 0.2;
  if (unilateral) score += 14;
  if (sustained) score += 10;
  if (adversaryFade) score += 8;
  return clamp100(score);
}

/** Risco defensivo agregado (leitura tática, não aposta). */
export function computeDefensiveRisk(input: PredictiveRiskInput): number {
  return clamp100(computeCollapseRisk(input) * 0.85 + input.chaosIndex * 0.15);
}

/** Probabilidade de ruptura contextual ofensiva. */
export function computeContextualBreakProbability(
  input: PredictiveRiskInput,
  contextualProbability: number
): number {
  const raw =
    contextualProbability * 0.4 +
    input.acceleration * 0.3 +
    input.marketLagScore * 0.2 +
    input.pressure * 0.1;
  return clamp100(raw);
}

export function computeRuptureRisk(
  breakProbability: number,
  collapseRisk: number
): number {
  return clamp100(breakProbability * 0.55 + collapseRisk * 0.45);
}

export function resolveTrendDirection(
  dominantSide: "home" | "away" | "balanced",
  momentum: number
): PredictiveTrendDirection {
  if (dominantSide === "home" || momentum >= 58) return "mandante";
  if (dominantSide === "away" || momentum <= 42) return "visitante";
  return "equilibrado";
}

export function trendDirectionLabel(dir: PredictiveTrendDirection): string {
  switch (dir) {
    case "mandante":
      return "Tendência ofensiva para o mandante";
    case "visitante":
      return "Tendência ofensiva para o visitante";
    default:
      return "Tendência equilibrada entre as equipes";
  }
}
