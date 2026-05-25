import type {
  HistoricalSignalOutcome,
  RecurringPattern,
  RecurringPatternType,
} from "@/lib/engine/learning/learning.types";

function pct(hits: number, total: number): number {
  return total > 0 ? Math.round((hits / total) * 1000) / 10 : 0;
}

/**
 * Detecta padrões recorrentes em outcomes históricos.
 */
export function detectRecurringPatterns(
  outcomes: HistoricalSignalOutcome[]
): RecurringPattern[] {
  const resolved = outcomes.filter((o) => o.outcome === "HIT" || o.outcome === "MISS");
  if (resolved.length < 3) return [];

  const patterns: RecurringPattern[] = [];

  const highPressure = resolved.filter((o) => o.pressureScore >= 70);
  const hpHits = highPressure.filter((o) => o.outcome === "HIT").length;
  const hpRate = pct(hpHits, highPressure.length);
  if (highPressure.length >= 5 && hpRate < 42) {
    patterns.push({
      type: "HIGH_PRESSURE_LOW_CONVERSION",
      label: "Pressão alta, conversão baixa",
      description:
        "Times com pressão elevada historicamente convertem menos que o modelo sugere.",
      strength: Math.min(100, Math.round((50 - hpRate) * 2)),
      sampleSize: highPressure.length,
    });
  }

  const late = resolved.filter((o) => o.minute >= 70);
  const lateHits = late.filter((o) => o.outcome === "HIT").length;
  if (late.length >= 4 && pct(lateHits, late.length) >= 55) {
    patterns.push({
      type: "LATE_GOAL_LEAGUE",
      label: "Gol tardio recorrente",
      description: "Sinais após o minuto 70 apresentam taxa de acerto acima da média.",
      strength: Math.min(100, pct(lateHits, late.length)),
      sampleSize: late.length,
    });
  }

  const hot = resolved.filter((o) => o.temperature === "HOT" || o.temperature === "IGNITE");
  const overMarkets = hot.filter((o) => o.market.startsWith("OVER"));
  const overHits = overMarkets.filter((o) => o.outcome === "HIT").length;
  if (overMarkets.length >= 4 && pct(overHits, overMarkets.length) < 35) {
    patterns.push({
      type: "HOT_GAME_NO_OVER",
      label: "Jogo quente sem over",
      description: "Temperatura operacional alta com underperformance em mercados de gols.",
      strength: 65,
      sampleSize: overMarkets.length,
    });
  }

  const highEv = resolved.filter((o) => (o.evPercent ?? 0) >= 8);
  const evHits = highEv.filter((o) => o.outcome === "HIT").length;
  if (highEv.length >= 4 && pct(evHits, highEv.length) < 40) {
    patterns.push({
      type: "MARKET_TRAP",
      label: "Armadilha de mercado",
      description: "EV elevado no modelo com realização abaixo do esperado — validar distorção.",
      strength: 72,
      sampleSize: highEv.length,
    });
  }

  const medPressure = resolved.filter(
    (o) => o.pressureScore >= 55 && o.pressureScore < 70
  );
  const medHits = medPressure.filter((o) => o.outcome === "HIT").length;
  if (medPressure.length >= 5 && pct(medHits, medPressure.length) < 38) {
    patterns.push({
      type: "FAKE_PRESSURE",
      label: "Pressão artificial",
      description: "Faixa média de pressão com baixa conversão — possível domínio estéril.",
      strength: 58,
      sampleSize: medPressure.length,
    });
  }

  const topPressure = resolved.filter((o) => o.pressureScore >= 75);
  const topHits = topPressure.filter((o) => o.outcome === "HIT").length;
  if (topPressure.length >= 4 && pct(topHits, topPressure.length) >= 58) {
    patterns.push({
      type: "OVERPERFORMING_PRESSURE",
      label: "Pressão overperforming",
      description: "Pressão extrema correlaciona com acerto acima do baseline histórico.",
      strength: Math.min(100, pct(topHits, topPressure.length)),
      sampleSize: topPressure.length,
    });
  }

  const byLeague = new Map<string, HistoricalSignalOutcome[]>();
  for (const o of resolved) {
    const list = byLeague.get(o.league) ?? [];
    list.push(o);
    byLeague.set(o.league, list);
  }

  for (const [league, rows] of byLeague) {
    if (rows.length < 6) continue;
    const lateRows = rows.filter((r) => r.minute >= 70);
    const lh = lateRows.filter((r) => r.outcome === "HIT").length;
    if (lateRows.length >= 3 && pct(lh, lateRows.length) >= 60) {
      patterns.push({
        type: "LATE_GOAL_LEAGUE",
        label: `Liga ${league} — late goal`,
        description: `Liga com incidência elevada de gols tardios em amostra de ${lateRows.length} sinais.`,
        strength: 70,
        sampleSize: lateRows.length,
        league,
      });
    }
  }

  return patterns
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 8);
}

export function patternTypeLabel(type: RecurringPatternType): string {
  const map: Record<RecurringPatternType, string> = {
    HIGH_PRESSURE_LOW_CONVERSION: "Baixa conversão sob pressão",
    LATE_GOAL_LEAGUE: "Late goal",
    HOT_GAME_NO_OVER: "Quente sem over",
    MARKET_TRAP: "Armadilha",
    FAKE_PRESSURE: "Pressão fake",
    OVERPERFORMING_PRESSURE: "Pressão eficiente",
  };
  return map[type];
}
