/**
 * Monta input de sequence memory a partir do histórico acumulado.
 */

import type { SequenceHistoryTick, SequenceMemoryInput } from "@/types/sequence";

export function buildSequenceMemoryInput(
  fixtureId: string,
  matchId: string | undefined,
  matchLabel: string | undefined,
  minute: number,
  history: SequenceHistoryTick[]
): SequenceMemoryInput {
  return {
    fixtureId,
    matchId,
    matchLabel,
    minute,
    pressureHistory: history.map((t) => t.pressureScore),
    temporalHistory: history.map((t) => t.chaosIndex),
    microeventHistory: history.map((t) => t.microeventScore),
    playerImpactHistory: history.map((t) => t.playerOffensiveImpact),
    playerFatigueHistory: history.map((t) => t.playerFatigueImpact),
    signalHistory: history.map((t) => t.signalActive),
    marketDriftHistory: history.map((t) => t.marketEdgePercent),
    minuteProgression: history.map((t) => t.minute),
  };
}
