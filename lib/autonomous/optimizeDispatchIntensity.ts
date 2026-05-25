import type {
  AdaptiveThresholdSet,
  AutonomousDecisionInput,
  DispatchIntensityDecision,
  OperationalAggressionMode,
  SignalSensitivity,
} from "@/lib/autonomous/autonomous.types";
import { sensitivityDispatchMultiplier } from "@/lib/autonomous/calculateSignalSensitivity";

export interface DispatchOptimizeResult {
  intensity: DispatchIntensityDecision;
  approved: boolean;
  forceTelegram: boolean;
  heroEligible: boolean;
}

/**
 * Decide intensidade de dispatch (skip → hero).
 */
export function optimizeDispatchIntensity(
  input: AutonomousDecisionInput,
  thresholds: AdaptiveThresholdSet,
  sensitivity: SignalSensitivity,
  aggression: OperationalAggressionMode,
  falsePositiveRisk: number,
  operationalScore: number
): DispatchOptimizeResult {
  const m = input.match;
  const p = m.pressure?.score ?? 0;
  const ev = m.evEngine?.expectedValue.best?.evPercent ?? 0;
  const conf = m.evEngine?.confidence.score ?? 0;
  const mult = sensitivityDispatchMultiplier(sensitivity);

  const effectiveScore = operationalScore * mult;

  if (aggression === "REDUCED" && falsePositiveRisk >= 55) {
    return {
      intensity: "SKIP",
      approved: false,
      forceTelegram: false,
      heroEligible: false,
    };
  }

  if (
    p < thresholds.minPressureScore &&
    ev < thresholds.minEvPercent &&
    effectiveScore < thresholds.minUrgencyScore
  ) {
    return {
      intensity: "SKIP",
      approved: false,
      forceTelegram: false,
      heroEligible: false,
    };
  }

  if (falsePositiveRisk >= 75) {
    return {
      intensity: "FEED_ONLY",
      approved: true,
      forceTelegram: false,
      heroEligible: false,
    };
  }

  let intensity: DispatchIntensityDecision = "FEED_ONLY";
  let forceTelegram = false;
  let heroEligible = false;

  if (effectiveScore >= thresholds.minUrgencyScore + 25 && ev >= thresholds.minEvPercent + 2) {
    intensity = "CRITICAL";
    forceTelegram = aggression !== "REDUCED" && falsePositiveRisk < 60;
    heroEligible = true;
  } else if (effectiveScore >= thresholds.minUrgencyScore + 12 || ev >= thresholds.minEvPercent + 1) {
    intensity = "HIGH";
    forceTelegram =
      aggression === "ELEVATED" || aggression === "MAXIMUM"
        ? falsePositiveRisk < 55
        : false;
    heroEligible = effectiveScore >= thresholds.minUrgencyScore + 18;
  } else if (p >= thresholds.minPressureScore || ev >= thresholds.minEvPercent) {
    intensity = "FEED_ONLY";
  }

  if (conf < thresholds.minConfidence && intensity === "CRITICAL") {
    intensity = "HIGH";
    forceTelegram = false;
  }

  if (aggression === "MAXIMUM" && intensity === "HIGH" && falsePositiveRisk < 40) {
    forceTelegram = true;
  }

  if (
    intensity === "CRITICAL" &&
    m.opsIntelligence?.temperature === "IGNITE" &&
    heroEligible
  ) {
    intensity = "HERO_PRIMARY";
  }

  return {
    intensity,
    approved: true,
    forceTelegram,
    heroEligible,
  };
}
