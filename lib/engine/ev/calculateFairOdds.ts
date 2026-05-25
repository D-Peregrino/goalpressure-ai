/**
 * Converte probabilidade (0–100) em odd justa decimal.
 */
export function probabilityToFairOdd(probabilityPercent: number): number {
  const p = Math.min(99, Math.max(5, probabilityPercent)) / 100;
  return Math.round((1 / p) * 100) / 100;
}

export function calculateFairOdds(probabilities: {
  over05: number;
  over15: number;
  overLive?: number;
}): { over05: number; over15: number; primary: number } {
  const over05 = probabilityToFairOdd(probabilities.over05);
  const over15 = probabilityToFairOdd(probabilities.over15);
  const primary = probabilityToFairOdd(
    probabilities.overLive ?? probabilities.over05
  );
  return { over05, over15, primary };
}
