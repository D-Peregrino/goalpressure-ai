import type {
  HistoricalSignalOutcome,
  LeagueBehaviorProfile,
} from "@/lib/engine/learning/learning.types";

function clamp(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)));
}

function leagueLabel(scores: {
  chaos: number;
  conversion: number;
  volatility: number;
}): string {
  if (scores.chaos >= 70) return "Liga caótica";
  if (scores.conversion >= 65) return "Liga de alta conversão";
  if (scores.conversion < 40) return "Liga de baixa conversão";
  if (scores.volatility >= 65) return "Liga explosiva";
  return "Liga equilibrada";
}

/**
 * Perfil comportamental por liga (chaos, conversion, volatility, pressure reliability).
 */
export function calculateLeagueBehavior(
  outcomes: HistoricalSignalOutcome[]
): LeagueBehaviorProfile[] {
  const resolved = outcomes.filter((o) => o.outcome === "HIT" || o.outcome === "MISS");
  const byLeague = new Map<string, HistoricalSignalOutcome[]>();

  for (const o of resolved) {
    if (!o.league) continue;
    const list = byLeague.get(o.league) ?? [];
    list.push(o);
    byLeague.set(o.league, list);
  }

  const profiles: LeagueBehaviorProfile[] = [];

  for (const [league, rows] of byLeague) {
    if (rows.length < 2) continue;

    const hits = rows.filter((r) => r.outcome === "HIT").length;
    const hitRate = hits / rows.length;
    const late = rows.filter((r) => r.minute >= 70);
    const lateHits = late.filter((r) => r.outcome === "HIT").length;
    const highP = rows.filter((r) => r.pressureScore >= 70);
    const highPHits = highP.filter((r) => r.outcome === "HIT").length;

    const avgPressure =
      rows.reduce((s, r) => s + r.pressureScore, 0) / rows.length;
    const pressureVariance =
      rows.reduce((s, r) => s + Math.abs(r.pressureScore - avgPressure), 0) /
      rows.length;

    const chaosScore = clamp(pressureVariance * 1.2 + avgPressure * 0.35);
    const conversionScore = clamp(hitRate * 100);
    const volatilityScore = clamp(
      (late.length / rows.length) * 80 + pressureVariance * 0.5
    );
    const pressureReliability = clamp(
      highP.length > 0 ? (highPHits / highP.length) * 100 : hitRate * 100
    );
    const lateGoalRate =
      late.length > 0 ? Math.round((lateHits / late.length) * 1000) / 10 : 0;

    const scores = {
      chaos: chaosScore,
      conversion: conversionScore,
      volatility: volatilityScore,
    };

    profiles.push({
      league,
      chaosScore,
      conversionScore,
      volatilityScore,
      pressureReliability,
      lateGoalRate,
      sampleSize: rows.length,
      label: leagueLabel(scores),
    });
  }

  return profiles.sort((a, b) => b.sampleSize - a.sampleSize);
}
