import type {
  AutonomousDecisionInput,
  MarketRegime,
  OperationalAggressionMode,
  SignalSensitivity,
} from "@/lib/autonomous/autonomous.types";

/**
 * Ajusta intensidade operacional do sistema.
 */
export function adjustOperationalAggression(
  input: AutonomousDecisionInput,
  regime: MarketRegime,
  sensitivity: SignalSensitivity,
  falsePositiveRisk: number,
  overfittingRisk: number
): OperationalAggressionMode {
  const acc = input.globalAccuracy ?? 50;
  const fpRate = input.globalFalsePositiveRate ?? 0;

  if (
    falsePositiveRisk >= 65 ||
    overfittingRisk >= 60 ||
    fpRate > 55 ||
    acc < 40
  ) {
    return "REDUCED";
  }

  if (sensitivity === "HYPER_AGGRESSIVE" && falsePositiveRisk < 35 && acc >= 50) {
    return "MAXIMUM";
  }

  if (
    sensitivity === "AGGRESSIVE" &&
    (regime === "AGGRESSIVE_MARKET" || regime === "LATE_GOAL_REGIME") &&
    falsePositiveRisk < 45
  ) {
    return "ELEVATED";
  }

  if (regime === "CHAOTIC_MARKET" || regime === "LOW_CONVERSION") {
    return "REDUCED";
  }

  return "NORMAL";
}

export function aggressionLabel(mode: OperationalAggressionMode): string {
  const map: Record<OperationalAggressionMode, string> = {
    REDUCED: "Reduzida",
    NORMAL: "Normal",
    ELEVATED: "Elevada",
    MAXIMUM: "Máxima",
  };
  return map[mode];
}
