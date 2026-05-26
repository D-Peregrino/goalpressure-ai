import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import {
  buildMarketRead,
  buildNarrative,
  buildOperationalStatus,
  buildRecommendation,
  buildTrendLabel,
} from "./contextNarratives";
import {
  buildContextBadges,
  classifyContextLevel,
  getContextSignals,
  type ContextBadge,
  type ContextLevel,
} from "./contextRules";

export interface ContextLogEntry {
  minute: string;
  label: string;
}

export interface MatchContextResult {
  score: number;
  level: ContextLevel;
  narrativa: string;
  statusOperacional: string;
  alerta: "baixo" | "moderado" | "alto" | "crítico";
  recomendacao: string;
  badges: ContextBadge[];
  intensidade: string;
  tendencia: string;
  leituraMercado: string;
  historico: ContextLogEntry[];
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function computeContextScore(match: EnrichedLiveMatch): number {
  const pressure = (match.pressureScore / 100) * 36;
  const dangerous = Math.min(1, match.dangerousAttacks / 55) * 18;
  const momentum = Math.min(1, Math.abs(match.momentum) / 100) * 14;
  const odd = Math.min(1, Math.abs(match.edgePercent ?? 0) / 8) * 12;
  const acceleration = Math.min(1, (match.engineAccelerationScore ?? 0) / 100) * 10;
  const trend = Math.min(1, Math.abs(match.trendMomentum ?? 0) / 100) * 10;
  return clamp100(pressure + dangerous + momentum + odd + acceleration + trend);
}

function levelIntensity(level: ContextLevel, score: number): string {
  if (level === "oportunidade_ev" || level === "zona_critica") return `Alta (${score})`;
  if (level === "pressao_crescente") return `Média-alta (${score})`;
  if (level === "monitoramento") return `Média (${score})`;
  if (level === "desaceleracao") return `Baixa (${score})`;
  return `Neutra (${score})`;
}

function alertLevel(level: ContextLevel): MatchContextResult["alerta"] {
  switch (level) {
    case "oportunidade_ev":
    case "zona_critica":
      return "crítico";
    case "pressao_crescente":
      return "alto";
    case "monitoramento":
      return "moderado";
    default:
      return "baixo";
  }
}

function buildHistory(match: EnrichedLiveMatch, context: MatchContextResult): ContextLogEntry[] {
  const minute = Math.max(1, match.minute ?? 1);
  const labels: string[] = [];
  if (context.level === "pressao_crescente") labels.push("pressão crescente");
  if (context.badges.includes("MERCADO ATRASADO")) labels.push("mercado atrasado");
  if (context.level === "zona_critica" || context.level === "oportunidade_ev") {
    labels.push("pressão extrema");
  }
  if (context.level === "desaceleracao") labels.push("desaceleração ofensiva");
  if (labels.length === 0) labels.push("monitoramento estável");

  return labels.slice(0, 4).map((label, idx) => ({
    minute: `${Math.max(1, minute - (labels.length - 1 - idx) * 3)}'`,
    label,
  }));
}

export function getMatchContextNarrative(match: EnrichedLiveMatch): string {
  const signals = getContextSignals(match);
  return buildNarrative(match, signals);
}

export function evaluateMatchContext(match: EnrichedLiveMatch): MatchContextResult {
  const signals = getContextSignals(match);
  const level = classifyContextLevel(match, signals);
  const score = computeContextScore(match);
  const narrativa = buildNarrative(match, signals);
  const statusOperacional = buildOperationalStatus(level);
  const recomendacao = buildRecommendation(level);
  const badges = buildContextBadges(match, signals);
  const tendencia = buildTrendLabel(match, signals);
  const leituraMercado = buildMarketRead(match, signals);

  const result: MatchContextResult = {
    score,
    level,
    narrativa,
    statusOperacional,
    alerta: alertLevel(level),
    recomendacao,
    badges,
    intensidade: levelIntensity(level, score),
    tendencia,
    leituraMercado,
    historico: [],
  };

  result.historico = buildHistory(match, result);
  return result;
}
