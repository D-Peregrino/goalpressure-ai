import type { CollectiveContext, CollectiveHeatCell } from "@/lib/network/network.types";

/** Consenso de mercado derivado do contexto coletivo — sem engine de odds. */
export function buildMarketConsensus(contexts: CollectiveContext[]): {
  hotLeagues: { league: string; heat: number }[];
  emerging: CollectiveHeatCell[];
} {
  const leagueHeat = new Map<string, number>();
  for (const c of contexts) {
    const league = c.league ?? "Outras";
    leagueHeat.set(league, (leagueHeat.get(league) ?? 0) + c.consensusScore);
  }

  const hotLeagues = [...leagueHeat.entries()]
    .map(([league, heat]) => ({ league, heat }))
    .sort((a, b) => b.heat - a.heat)
    .slice(0, 6);

  const emerging = contexts
    .filter((c) => c.consensusScore >= 55 && c.observerCount >= 2)
    .map(
      (c): CollectiveHeatCell => ({
        fixtureId: c.fixtureId,
        matchLabel: c.matchLabel,
        league: c.league,
        observerCount: c.observerCount,
        consensusScore: c.consensusScore,
        collectivePressure: c.collectivePressure,
      })
    )
    .slice(0, 12);

  return { hotLeagues, emerging };
}

export function marketConsensusLabel(score: number): string {
  if (score >= 80) return "Convergência forte";
  if (score >= 60) return "Atenção coletiva";
  if (score >= 40) return "Monitoramento moderado";
  return "Baixa convergência";
}
