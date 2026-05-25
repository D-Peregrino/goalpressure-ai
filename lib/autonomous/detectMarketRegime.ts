import type { AutonomousDecisionInput, MarketRegime } from "@/lib/autonomous/autonomous.types";

function totalGoals(match: AutonomousDecisionInput["match"]): number {
  return (match.score?.home ?? 0) + (match.score?.away ?? 0);
}

/**
 * Detecta regime de mercado/contexto operacional.
 */
export function detectMarketRegime(input: AutonomousDecisionInput): MarketRegime {
  const m = input.match;
  const p = m.pressure?.score ?? 0;
  const chaos = m.opsIntelligence?.chaosLevel ?? m.chaosIndex ?? 0;
  const minute = m.minute;
  const goals = totalGoals(m);
  const fpRate = input.globalFalsePositiveRate ?? 0;
  const acc = input.globalAccuracy ?? 50;

  if (minute >= 70 && p >= 55 && goals <= 2) return "LATE_GOAL_REGIME";
  if (chaos >= 72 || m.opsIntelligence?.gameState === "CHAOTIC") {
    return "CHAOTIC_MARKET";
  }
  if (goals >= 3 && p >= 50) return "HIGH_SCORING";
  if (p >= 65 && (m.stats.shotsOnTarget ?? m.stats.shots) < 3 && m.stats.dangerousAttacks >= 12) {
    return "LOW_CONVERSION";
  }
  if (p >= 68 && acc >= 52 && fpRate < 45) return "AGGRESSIVE_MARKET";
  if (p < 40 && chaos < 35) return "CALM_MARKET";

  return fpRate > 55 ? "LOW_CONVERSION" : "CALM_MARKET";
}

export function regimeLabel(regime: MarketRegime): string {
  const map: Record<MarketRegime, string> = {
    CALM_MARKET: "Mercado calmo",
    AGGRESSIVE_MARKET: "Mercado agressivo",
    CHAOTIC_MARKET: "Mercado caótico",
    LOW_CONVERSION: "Baixa conversão",
    HIGH_SCORING: "Alta pontuação",
    LATE_GOAL_REGIME: "Regime gol tardio",
  };
  return map[regime];
}
