import type {
  AutonomousDecisionInput,
  MarketRegime,
  SignalSensitivity,
} from "@/lib/autonomous/autonomous.types";

/**
 * Conservative → HyperAggressive — impacta frequência e dispatch.
 */
export function calculateSignalSensitivity(
  input: AutonomousDecisionInput,
  regime: MarketRegime,
  falsePositiveRisk: number
): SignalSensitivity {
  const acc = input.globalAccuracy ?? 50;
  const fpRate = input.globalFalsePositiveRate ?? 0;
  const edge = input.match.learningContext?.historicalEdge.score ?? 50;
  const ev = input.match.evEngine?.expectedValue.best?.evPercent ?? 0;

  if (falsePositiveRisk >= 70 || fpRate > 58 || acc < 38) {
    return "CONSERVATIVE";
  }

  if (
    regime === "AGGRESSIVE_MARKET" &&
    edge >= 62 &&
    ev >= 5 &&
    falsePositiveRisk < 40
  ) {
    return "HYPER_AGGRESSIVE";
  }

  if (
    (regime === "LATE_GOAL_REGIME" || regime === "HIGH_SCORING") &&
    falsePositiveRisk < 50 &&
    acc >= 48
  ) {
    return "AGGRESSIVE";
  }

  if (regime === "CHAOTIC_MARKET" || regime === "LOW_CONVERSION") {
    return "CONSERVATIVE";
  }

  return "BALANCED";
}

export function sensitivityLabel(s: SignalSensitivity): string {
  const map: Record<SignalSensitivity, string> = {
    CONSERVATIVE: "Conservador",
    BALANCED: "Equilibrado",
    AGGRESSIVE: "Agressivo",
    HYPER_AGGRESSIVE: "Hiper-agressivo",
  };
  return map[s];
}

export function sensitivityDispatchMultiplier(s: SignalSensitivity): number {
  const map: Record<SignalSensitivity, number> = {
    CONSERVATIVE: 0.75,
    BALANCED: 1,
    AGGRESSIVE: 1.15,
    HYPER_AGGRESSIVE: 1.35,
  };
  return map[s];
}
