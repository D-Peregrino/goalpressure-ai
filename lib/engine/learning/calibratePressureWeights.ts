import { PRESSURE_WEIGHTS } from "@/lib/engine/pressure/pressureWeights";
import type {
  HistoricalSignalOutcome,
  PressureWeightRecommendation,
} from "@/lib/engine/learning/learning.types";
import { calculateSignalAccuracy } from "@/lib/engine/learning/calculateSignalAccuracy";

/**
 * Sugere novos pesos da Pressure Engine (não aplica automaticamente).
 */
export function calibratePressureWeights(
  outcomes: HistoricalSignalOutcome[]
): PressureWeightRecommendation | null {
  const resolved = outcomes.filter((o) => o.outcome === "HIT" || o.outcome === "MISS");
  if (resolved.length < 5) return null;

  const accuracy = calculateSignalAccuracy(resolved);
  const highP = resolved.filter((o) => o.pressureScore >= 70);
  const lowP = resolved.filter((o) => o.pressureScore < 55);
  const highHits = highP.filter((o) => o.outcome === "HIT").length;
  const lowHits = lowP.filter((o) => o.outcome === "HIT").length;
  const highRate = highP.length > 0 ? highHits / highP.length : 0;
  const lowRate = lowP.length > 0 ? lowHits / lowP.length : 0;
  const falsePositiveRate =
    highP.length > 0
      ? Math.round((1 - highRate) * 1000) / 10
      : 0;

  const current = { ...PRESSURE_WEIGHTS } as Record<string, number>;
  const suggested = { ...current };

  if (highRate < 0.4 && highP.length >= 4) {
    suggested.recentDangerousAttacks = Math.max(
      0.08,
      current.recentDangerousAttacks - 0.02
    );
    suggested.recentShotsOnTarget = Math.max(
      0.08,
      current.recentShotsOnTarget - 0.01
    );
    suggested.offensiveIntensity = Math.min(
      0.12,
      current.offensiveIntensity + 0.02
    );
  } else if (highRate >= 0.55) {
    suggested.recentDangerousAttacks = Math.min(
      0.22,
      current.recentDangerousAttacks + 0.02
    );
    suggested.recentMomentum = Math.min(0.14, current.recentMomentum + 0.02);
  }

  if (lowRate > highRate + 0.15) {
    suggested.currentOddValue = Math.max(0.03, current.currentOddValue - 0.01);
    suggested.xgAccumulated = Math.min(0.18, current.xgAccumulated + 0.02);
  }

  const sum = Object.values(suggested).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(suggested)) {
    suggested[k] = Math.round((suggested[k] / sum) * 1000) / 1000;
  }

  const rationale =
    highRate < 0.4
      ? "Falsos positivos em pressão alta — reduzir peso de ataques perigosos e reforçar intensidade."
      : "Pressão extrema performando — aumentar peso de momentum e ataques perigosos.";

  return {
    currentWeights: current,
    suggestedWeights: suggested,
    rationale,
    accuracyBefore: accuracy.hitRate,
    falsePositiveRate,
    confidence: Math.min(100, resolved.length * 8),
  };
}
