import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";

export type ContextLevel =
  | "neutro"
  | "monitoramento"
  | "pressao_crescente"
  | "zona_critica"
  | "oportunidade_ev"
  | "desaceleracao";

export type ContextBadge =
  | "PRESSÃO ALTA"
  | "DISTORÇÃO DE ODD"
  | "DOMÍNIO TERRITORIAL"
  | "TRANSIÇÃO RÁPIDA"
  | "BAIXA EFICIÊNCIA"
  | "MERCADO ATRASADO";

export interface ContextSignalSet {
  pressureHigh: boolean;
  pressureCritical: boolean;
  dangerousHigh: boolean;
  territorialDominance: boolean;
  accelerationHigh: boolean;
  accelerationLow: boolean;
  momentumUp: boolean;
  momentumDown: boolean;
  oddDistortion: boolean;
  marketLate: boolean;
  lowEfficiency: boolean;
  transitionFast: boolean;
}

export function getContextSignals(match: EnrichedLiveMatch): ContextSignalSet {
  const pressure = match.pressureScore;
  const dangerous = match.dangerousAttacks;
  const acceleration = match.engineAccelerationScore ?? 0;
  const territorial = match.engineTerritorialScore ?? 0;
  const momentum = match.momentum;
  const oddDistortion = Math.abs(match.edgePercent ?? 0) >= 4;
  const marketLate =
    (match.edgePercent ?? 0) >= 5 ||
    (match.oddsDrift != null && Math.abs(match.oddsDrift) >= 0.08);
  const lowEfficiency = match.shots >= 8 && match.shotsOnTarget <= Math.max(1, Math.round(match.shots * 0.22));
  const transitionFast = acceleration >= 60 || (match.triggerWindow ?? "").toUpperCase().includes("HOT");

  return {
    pressureHigh: pressure >= 62,
    pressureCritical: pressure >= 78,
    dangerousHigh: dangerous >= 38,
    territorialDominance: territorial >= 58 || match.dominantSide !== "balanced",
    accelerationHigh: acceleration >= 60,
    accelerationLow: acceleration > 0 && acceleration <= 28,
    momentumUp: momentum >= 55,
    momentumDown: momentum <= 35,
    oddDistortion,
    marketLate,
    lowEfficiency,
    transitionFast,
  };
}

export function classifyContextLevel(match: EnrichedLiveMatch, s: ContextSignalSet): ContextLevel {
  if (s.pressureCritical && (s.marketLate || s.oddDistortion || match.evPlus)) return "oportunidade_ev";
  if (s.pressureCritical) return "zona_critica";
  if (s.momentumDown || s.accelerationLow) return "desaceleracao";
  if (s.pressureHigh || s.dangerousHigh || s.accelerationHigh) return "pressao_crescente";
  if (s.oddDistortion || s.territorialDominance) return "monitoramento";
  return "neutro";
}

export function buildContextBadges(match: EnrichedLiveMatch, s: ContextSignalSet): ContextBadge[] {
  const badges: ContextBadge[] = [];
  if (s.pressureHigh) badges.push("PRESSÃO ALTA");
  if (s.oddDistortion) badges.push("DISTORÇÃO DE ODD");
  if (s.territorialDominance) badges.push("DOMÍNIO TERRITORIAL");
  if (s.transitionFast) badges.push("TRANSIÇÃO RÁPIDA");
  if (s.lowEfficiency) badges.push("BAIXA EFICIÊNCIA");
  if (s.marketLate || match.evPlus) badges.push("MERCADO ATRASADO");
  return badges.slice(0, 3);
}
