import type {
  HistoricalSignalOutcome,
  LateGoalPatternSummary,
} from "@/lib/engine/learning/learning.types";

/**
 * Analytics de gols tardios (minuto 70+).
 */
export function detectLateGoalPatterns(
  outcomes: HistoricalSignalOutcome[]
): LateGoalPatternSummary {
  const resolved = outcomes.filter((o) => o.outcome === "HIT" || o.outcome === "MISS");
  const late = resolved.filter((o) => o.minute >= 70);
  const lateHits = late.filter((o) => o.outcome === "HIT").length;
  const latePressure = late.filter((o) => o.pressureScore >= 65);
  const lpHits = latePressure.filter((o) => o.outcome === "HIT").length;

  const scorelineImpact: Record<string, number> = {};
  for (const o of late) {
    const key = o.finalScore.includes("-")
      ? o.finalScore.split("-").reduce((a, b) => a + Number(b), 0) <= 2
        ? "low_scoring"
        : "high_scoring"
      : "unknown";
    scorelineImpact[key] = (scorelineImpact[key] ?? 0) + (o.outcome === "HIT" ? 1 : 0);
  }

  const latePressureHitRate =
    late.length > 0 ? Math.round((lateHits / late.length) * 1000) / 10 : 0;

  const accelerationImpact =
    latePressure.length > 0
      ? Math.round((lpHits / latePressure.length) * 1000) / 10
      : 0;

  let description =
    "Amostra insuficiente para padrão tardio — aguardando mais outcomes resolvidos.";
  if (late.length >= 3) {
    description = `Minuto 70+: taxa de acerto ${latePressureHitRate}%. Pressão tardia ≥65 correlaciona com ${accelerationImpact}% de realização.`;
  }

  return {
    latePressureHitRate,
    minute70PlusSignals: late.length,
    accelerationImpact,
    scorelineImpact,
    description,
  };
}
