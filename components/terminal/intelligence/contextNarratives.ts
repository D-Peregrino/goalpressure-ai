import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import type { ContextLevel, ContextSignalSet } from "./contextRules";

function sideLabel(match: EnrichedLiveMatch): string {
  if (match.dominantSide === "home") return match.homeTeam;
  if (match.dominantSide === "away") return match.awayTeam;
  return "as duas equipes";
}

export function buildNarrative(match: EnrichedLiveMatch, s: ContextSignalSet): string {
  const side = sideLabel(match);
  if (s.pressureCritical) {
    return `${side} elevou a pressão ofensiva para zona crítica neste momento da partida.`;
  }
  if (s.pressureHigh && s.territorialDominance) {
    return `${side} mantém pressão ofensiva contínua com domínio territorial consolidado.`;
  }
  if (s.marketLate && s.dangerousHigh) {
    return "Mercado ainda não reagiu ao aumento recente de ataques perigosos.";
  }
  if (s.accelerationLow || s.momentumDown) {
    return "Ritmo ofensivo caiu nos últimos minutos e a intensidade perdeu força.";
  }
  if (s.transitionFast) {
    return `${side} acelera transições ofensivas e força o bloco adversário a recuar.`;
  }
  if (s.lowEfficiency) {
    return "Volume ofensivo alto, mas baixa eficiência de finalização até aqui.";
  }
  return "Partida em monitoramento, com sinais táticos moderados e sem ruptura de ritmo.";
}

export function buildRecommendation(level: ContextLevel): string {
  switch (level) {
    case "oportunidade_ev":
      return "Oportunidade contextual com distorção detectada; manter acompanhamento ativo.";
    case "zona_critica":
      return "Zona crítica de pressão ofensiva; atualizar leitura a cada novo evento.";
    case "pressao_crescente":
      return "Pressão crescente; monitorar aceleração e resposta defensiva.";
    case "desaceleracao":
      return "Desaceleração ofensiva; revisar tendência antes de novas decisões operacionais.";
    case "monitoramento":
      return "Monitoramento contínuo; sinais presentes, porém sem confirmação crítica.";
    default:
      return "Cenário neutro; manter acompanhamento regular da dinâmica da partida.";
  }
}

export function buildOperationalStatus(level: ContextLevel): string {
  switch (level) {
    case "oportunidade_ev":
      return "Oportunidade contextual EV+";
    case "zona_critica":
      return "Pressão ofensiva em zona crítica";
    case "pressao_crescente":
      return "Pressão ofensiva crescente";
    case "desaceleracao":
      return "Desaceleração ofensiva";
    case "monitoramento":
      return "Monitoramento ativo";
    default:
      return "Leitura neutra";
  }
}

export function buildTrendLabel(match: EnrichedLiveMatch, s: ContextSignalSet): string {
  if (s.momentumUp || s.accelerationHigh) return "Tendência de aceleração";
  if (s.momentumDown || s.accelerationLow) return "Tendência de desaceleração";
  if ((match.pressureTrend ?? "").toLowerCase().includes("up")) return "Tendência de alta pressão";
  if ((match.pressureTrend ?? "").toLowerCase().includes("down")) return "Tendência de retração";
  return "Tendência estável";
}

export function buildMarketRead(match: EnrichedLiveMatch, s: ContextSignalSet): string {
  if (s.marketLate) return "Leitura de mercado atrasada em relação ao contexto em campo.";
  if (s.oddDistortion) return "Distorção de odd detectada, com divergência em relação ao fluxo da partida.";
  if ((match.edgePercent ?? 0) <= -3) return "Mercado ajustado contra o fluxo ofensivo recente.";
  return "Mercado aderente ao contexto atual, sem distorções relevantes.";
}
