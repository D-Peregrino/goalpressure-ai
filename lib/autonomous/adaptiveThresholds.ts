import type {
  AdaptiveThresholdSet,
  AutonomousDecisionInput,
  MarketRegime,
} from "@/lib/autonomous/autonomous.types";

const BASE: AdaptiveThresholdSet = {
  minPressureScore: 62,
  minEvPercent: 3.5,
  minConfidence: 48,
  minUrgencyScore: 42,
};

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(v * 10) / 10));
}

/**
 * Thresholds adaptativos por liga, regime e histórico.
 */
export function adaptiveThresholds(
  input: AutonomousDecisionInput,
  regime: MarketRegime
): AdaptiveThresholdSet {
  const t = { ...BASE };
  const league = (input.match.league ?? "").toLowerCase();
  const fpRate = input.globalFalsePositiveRate ?? 0;
  const acc = input.globalAccuracy ?? 50;
  const sample = input.leagueSampleSize ?? 0;

  if (
    league.includes("premier") ||
    league.includes("la liga") ||
    league.includes("bundesliga")
  ) {
    t.minPressureScore = clamp(t.minPressureScore - 4, 50, 85);
    t.minEvPercent = clamp(t.minEvPercent - 0.5, 2, 12);
  }

  if (sample < 5) {
    t.minPressureScore = clamp(t.minPressureScore + 6, 50, 90);
    t.minConfidence = clamp(t.minConfidence + 8, 40, 90);
  }

  switch (regime) {
    case "CALM_MARKET":
      t.minPressureScore = clamp(t.minPressureScore + 5, 50, 90);
      t.minEvPercent = clamp(t.minEvPercent + 1, 2, 15);
      break;
    case "AGGRESSIVE_MARKET":
      t.minPressureScore = clamp(t.minPressureScore - 3, 48, 85);
      t.minEvPercent = clamp(t.minEvPercent - 0.8, 2, 12);
      break;
    case "CHAOTIC_MARKET":
      t.minUrgencyScore = clamp(t.minUrgencyScore + 8, 35, 90);
      t.minConfidence = clamp(t.minConfidence + 5, 40, 90);
      break;
    case "LOW_CONVERSION":
      t.minPressureScore = clamp(t.minPressureScore + 7, 55, 92);
      t.minEvPercent = clamp(t.minEvPercent + 1.5, 3, 18);
      break;
    case "HIGH_SCORING":
      t.minEvPercent = clamp(t.minEvPercent - 1, 2, 10);
      break;
    case "LATE_GOAL_REGIME":
      t.minPressureScore = clamp(t.minPressureScore - 2, 50, 80);
      t.minUrgencyScore = clamp(t.minUrgencyScore - 5, 35, 75);
      break;
  }

  if (fpRate > 50) {
    t.minPressureScore = clamp(t.minPressureScore + 5, 50, 95);
    t.minEvPercent = clamp(t.minEvPercent + 1.2, 3, 20);
  }
  if (acc < 42) {
    t.minConfidence = clamp(t.minConfidence + 10, 45, 95);
  }

  return t;
}
