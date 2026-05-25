import type { RankedEvSignal } from "@/lib/engine/ev/ev.types";

/**
 * Ordena oportunidades: EV → confiança → pressão implícita no rankScore.
 */
export function rankOpportunities(signals: RankedEvSignal[]): RankedEvSignal[] {
  return [...signals].sort((a, b) => {
    if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
    if (b.evPercent !== a.evPercent) return b.evPercent - a.evPercent;
    return b.confidenceScore - a.confidenceScore;
  });
}

export function computeRankScore(signal: RankedEvSignal, pressureScore: number): number {
  const evW = signal.evPercent * 1.2;
  const confW = signal.confidenceScore * 0.85;
  const pressW = pressureScore * 0.35;
  const accelBonus =
    signal.signalType === "EV_PRESSURE_BREAK" ? 8 : 0;
  return Math.round(evW + confW + pressW + accelBonus);
}
