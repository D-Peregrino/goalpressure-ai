import type { OperatorProfile, SharedSignal } from "@/lib/network/network.types";

export interface ReputationInput {
  userId: string;
  displayName: string;
  signals: SharedSignal[];
  votesCast: number;
}

/** Calcula scores de reputação — camada de rede, sem engines de jogo. */
export function computeOperatorReputation(input: ReputationInput): OperatorProfile {
  const userSignals = input.signals.filter((s) => s.userId === input.userId);
  const signalsCount = userSignals.length;

  const votesReceived = userSignals.reduce(
    (a, s) => a + s.validateCount + s.usefulCount,
    0
  );

  const participationScore = Math.min(100, signalsCount * 6 + input.votesCast * 3 + 20);

  const precisionScore = Math.min(
    100,
    45 +
      userSignals.reduce((a, s) => a + s.validateCount * 4, 0) /
        Math.max(1, userSignals.length)
  );

  const anticipationScore = Math.min(
    100,
    40 +
      userSignals.filter((s) => s.signalType === "rupture").length * 12 +
      userSignals.filter((s) => (s.minute ?? 0) >= 60).length * 5
  );

  const falsePositiveRate = Math.max(
    5,
    Math.min(
      45,
      30 - userSignals.filter((s) => s.signalType === "rupture").length * 3
    )
  );

  const reliabilityScore = Math.round(
    precisionScore * 0.4 + anticipationScore * 0.3 + participationScore * 0.2 +
      (100 - falsePositiveRate) * 0.1
  );

  const reputationScore = Math.round(
    (precisionScore + anticipationScore + participationScore + reliabilityScore) / 4
  );

  return {
    userId: input.userId,
    displayName: input.displayName,
    reputationScore: Math.min(100, Math.max(10, reputationScore)),
    precisionScore: Math.min(100, Math.round(precisionScore)),
    anticipationScore: Math.min(100, Math.round(anticipationScore)),
    participationScore: Math.min(100, Math.round(participationScore)),
    falsePositiveRate: Math.round(falsePositiveRate),
    reliabilityScore: Math.min(100, Math.max(10, reliabilityScore)),
    signalsCount,
    votesReceived,
  };
}

export function rankOperators(operators: OperatorProfile[]): OperatorProfile[] {
  return [...operators]
    .sort((a, b) => {
      const scoreA = a.precisionScore * 0.45 + a.anticipationScore * 0.35 + a.reliabilityScore * 0.2;
      const scoreB = b.precisionScore * 0.45 + b.anticipationScore * 0.35 + b.reliabilityScore * 0.2;
      return scoreB - scoreA;
    })
    .map((o, i) => ({ ...o, rank: i + 1 }));
}
