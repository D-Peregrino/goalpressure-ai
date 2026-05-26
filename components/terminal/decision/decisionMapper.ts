import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import type { MatchContextResult } from "@/components/terminal/intelligence/ContextEngine";
import { getContextSignals } from "@/components/terminal/intelligence/contextRules";

export type DecisionSeal =
  | "NEUTRO"
  | "ACOMPANHAR"
  | "ALERTA"
  | "OPORTUNIDADE"
  | "EVITAR";

export type RiskLevel = "Baixo" | "Moderado" | "Alto" | "Muito alto";

export type SuggestedAction =
  | "Apenas acompanhar"
  | "Monitorar de perto"
  | "Atenção elevada"
  | "Oportunidade em formação"
  | "Evitar neste momento";

export type SealTone = "neutral" | "watch" | "alert" | "opportunity" | "avoid";

export interface OperationalDecision {
  situacaoAtual: string;
  acaoSugerida: SuggestedAction;
  risco: RiskLevel;
  justificativa: string;
  confianca: number;
  selo: DecisionSeal;
  sealTone: SealTone;
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function computeConfidence(match: EnrichedLiveMatch, context: MatchContextResult): number {
  const base =
    match.confidence * 0.35 +
    match.validationScore * 0.25 +
    context.score * 0.2 +
    (match.evConfidence ?? match.confidence) * 0.1 +
    (match.autonomousConfidence ?? 50) * 0.1;
  const penalty =
    (match.lowConfidence ? 18 : 0) +
    (match.dataQuality === "sparse" ? 12 : 0) +
    ((match.autonomousFalsePositiveRisk ?? 0) >= 0.55 ? 15 : 0);
  return clamp100(base - penalty);
}

function computeRisk(
  match: EnrichedLiveMatch,
  context: MatchContextResult,
  signals: ReturnType<typeof getContextSignals>
): RiskLevel {
  const chaos = match.chaosIndex;
  const fp = match.autonomousFalsePositiveRisk ?? 0;
  const dispatchHigh =
    (match.dispatchPriority ?? 0) >= 70 ||
    (match.dispatchUrgency ?? "").toUpperCase().includes("HIGH");
  const opsChaos = (match.opsChaosLevel ?? 0) >= 65;

  if (chaos >= 75 || fp >= 0.7 || opsChaos || dispatchHigh) return "Muito alto";
  if (
    context.alerta === "crítico" ||
    chaos >= 55 ||
    context.level === "zona_critica" ||
    signals.pressureCritical
  ) {
    return "Alto";
  }
  if (context.alerta === "alto" || context.alerta === "moderado" || chaos >= 35) {
    return "Moderado";
  }
  return "Baixo";
}

function buildSituacao(
  match: EnrichedLiveMatch,
  context: MatchContextResult,
  signals: ReturnType<typeof getContextSignals>
): string {
  if (match.isPreMatch && !match.isLive) return "Aguardar mais dados";
  if (context.level === "oportunidade_ev" || (match.evPlus && signals.marketLate)) {
    return "Oportunidade de valor";
  }
  if (context.level === "zona_critica" || signals.pressureCritical) {
    return "Zona crítica";
  }
  if (signals.marketLate || context.badges.includes("MERCADO ATRASADO")) {
    return "Mercado atrasado";
  }
  if (context.level === "desaceleracao" || signals.momentumDown) {
    return "Ritmo caiu";
  }
  if (context.level === "pressao_crescente" || signals.pressureHigh) {
    return "Pressão ofensiva crescente";
  }
  if (
    match.pressureScore < 35 &&
    match.chaosIndex < 40 &&
    context.level === "neutro"
  ) {
    return "Jogo controlado";
  }
  if (!match.isLive) return "Aguardar mais dados";
  return "Jogo controlado";
}

function buildJustificativa(
  match: EnrichedLiveMatch,
  context: MatchContextResult,
  signals: ReturnType<typeof getContextSignals>
): string {
  if (match.opsNarrative?.trim()) {
    return match.opsNarrative.trim();
  }
  if (signals.lowEfficiency && signals.pressureHigh) {
    return "Pressão ofensiva subiu, mas a eficiência nas finalizações ainda é baixa.";
  }
  if (signals.marketLate) {
    return "O contexto em campo evoluiu mais rápido que a reação observada nas odds.";
  }
  if (signals.pressureCritical) {
    return "Índice de pressão e ataques perigosos indicam momento ofensivo intenso.";
  }
  if (context.level === "desaceleracao") {
    return "Momento ofensivo e aceleração perderam ritmo nos minutos recentes.";
  }
  if (match.evPlus && (match.evPercent ?? 0) > 0) {
    return "Leitura de valor esperado positiva com suporte tático moderado.";
  }
  if (context.narrativa) return context.narrativa;
  return "Leitura consolidada a partir de pressão, ritmo e risco contextual da partida.";
}

function mapAcao(
  selo: DecisionSeal,
  situacao: string
): SuggestedAction {
  switch (selo) {
    case "EVITAR":
      return "Evitar neste momento";
    case "OPORTUNIDADE":
      return "Oportunidade em formação";
    case "ALERTA":
      return "Atenção elevada";
    case "ACOMPANHAR":
      return situacao === "Jogo controlado" ? "Apenas acompanhar" : "Monitorar de perto";
    default:
      return "Apenas acompanhar";
  }
}

function mapSelo(
  match: EnrichedLiveMatch,
  context: MatchContextResult,
  signals: ReturnType<typeof getContextSignals>,
  confianca: number,
  risco: RiskLevel
): { selo: DecisionSeal; tone: SealTone } {
  const avoid =
    confianca < 42 ||
    match.dataQuality === "sparse" ||
    risco === "Muito alto" ||
    (match.autonomousFalsePositiveRisk ?? 0) >= 0.65;

  if (avoid) return { selo: "EVITAR", tone: "avoid" };

  if (
    context.level === "oportunidade_ev" ||
    (match.evPlus && confianca >= 55 && signals.marketLate)
  ) {
    return { selo: "OPORTUNIDADE", tone: "opportunity" };
  }

  if (
    context.level === "zona_critica" ||
    signals.pressureCritical ||
    context.alerta === "crítico" ||
    context.alerta === "alto"
  ) {
    return { selo: "ALERTA", tone: "alert" };
  }

  if (
    context.level === "pressao_crescente" ||
    context.level === "monitoramento" ||
    match.dispatchUrgency
  ) {
    return { selo: "ACOMPANHAR", tone: "watch" };
  }

  return { selo: "NEUTRO", tone: "neutral" };
}

export function mapOperationalDecision(
  match: EnrichedLiveMatch,
  context: MatchContextResult
): OperationalDecision {
  const signals = getContextSignals(match);
  const confianca = computeConfidence(match, context);
  const risco = computeRisk(match, context, signals);
  const situacaoAtual = buildSituacao(match, context, signals);
  const { selo, tone } = mapSelo(match, context, signals, confianca, risco);
  const acaoSugerida = mapAcao(selo, situacaoAtual);
  const justificativa = buildJustificativa(match, context, signals);

  return {
    situacaoAtual,
    acaoSugerida,
    risco,
    justificativa,
    confianca,
    selo,
    sealTone: tone,
  };
}
