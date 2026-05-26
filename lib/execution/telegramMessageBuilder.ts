import { evaluateMatchContext } from "@/components/terminal/intelligence/ContextEngine";
import { mapOperationalDecision } from "@/components/terminal/decision/decisionMapper";
import type { ExecutedDispatch, QueuedDispatch } from "@/lib/execution/execution.types";
import { dispatchToContextMatch } from "@/lib/execution/telegramContextAdapter";
import {
  buildAggregateHeader,
  buildContextualHeader,
  distortionLabel,
  formatMonitoredMarket,
  formatTelegramBulletList,
  formatTelegramSection,
  getTelegramAccent,
  mapUrgencyToVisualLevel,
  sanitizeTelegramCopy,
  type TelegramMessageKind,
  type TelegramVisualLevel,
} from "@/lib/execution/telegramTemplates";

export interface PremiumTelegramPayload {
  text: string;
  level: TelegramVisualLevel;
  kind: TelegramMessageKind | "contextual_reading";
  fixtureId: string;
  matchLabel: string;
  fingerprint: string;
}

function situacaoFromDecision(situacao: string, contextNarrativa: string): string {
  if (situacao && situacao !== "Jogo controlado") return situacao;
  const first = contextNarrativa.split(".")[0]?.trim();
  return first || "Monitoramento tático em curso";
}

function contextualReadingBlock(narrativa: string, leituraMercado: string): string {
  const parts = [narrativa.trim()];
  if (leituraMercado && !narrativa.includes(leituraMercado.slice(0, 24))) {
    parts.push(leituraMercado.trim());
  }
  return sanitizeTelegramCopy(parts.filter(Boolean).join(" "));
}

function statusFromSelo(selo: string, acao: string): string {
  if (acao && acao !== "Apenas acompanhar") return acao;
  const map: Record<string, string> = {
    NEUTRO: "Leitura neutra — acompanhamento regular",
    ACOMPANHAR: "Monitoramento ativo",
    ALERTA: "Atenção operacional elevada",
    OPORTUNIDADE: "Oportunidade em formação",
    EVITAR: "Cautela recomendada neste momento",
  };
  return map[selo] ?? acao;
}

export function buildPremiumTelegramPayload(item: QueuedDispatch): PremiumTelegramPayload {
  const match = dispatchToContextMatch(item);
  const context = evaluateMatchContext(match);
  const decision = mapOperationalDecision(match, context);

  const level = mapUrgencyToVisualLevel(item.urgency, decision.selo, context.level);
  const accent = getTelegramAccent(level);

  const matchLine = `${item.homeTeam} x ${item.awayTeam}`;
  const minuteLine = `${item.minute}'`;
  const situacao = situacaoFromDecision(decision.situacaoAtual, context.narrativa);
  const leitura = contextualReadingBlock(context.narrativa, context.leituraMercado);

  const sections = [
    ...buildContextualHeader(accent),
    "",
    formatTelegramSection("JOGO", `${matchLine}\n${minuteLine}`),
    "",
    formatTelegramSection("SITUAÇÃO", situacao),
    "",
    formatTelegramSection("DECISÃO OPERACIONAL", decision.acaoSugerida),
    "",
    formatTelegramSection("LEITURA CONTEXTUAL", leitura),
    "",
    formatTelegramBulletList("INDICADORES", [
      { label: "Pressão ofensiva", value: String(Math.round(item.pressureScore)) },
      { label: "Momento ofensivo", value: String(Math.round(item.momentumScore)) },
      { label: "Intensidade contextual", value: context.intensidade },
      { label: "Distorção de cotação", value: distortionLabel(item.evPercent) },
      { label: "Risco", value: decision.risco },
      { label: "Confiança da leitura", value: `${decision.confianca}%` },
    ]),
    "",
    formatTelegramSection("MERCADO MONITORADO", formatMonitoredMarket(String(item.market))),
    "",
    formatTelegramSection("STATUS", statusFromSelo(decision.selo, decision.acaoSugerida)),
  ];

  const text = sections.join("\n");
  const fingerprint = [
    item.fixtureId,
    level,
    decision.selo,
    situacao.slice(0, 40),
    Math.floor(item.minute / 5),
  ].join("|");

  return {
    text,
    level,
    kind: "contextual_reading",
    fixtureId: item.fixtureId,
    matchLabel: item.matchLabel,
    fingerprint,
  };
}

/** Mensagem principal exportada para o engine Telegram. */
export function buildPremiumOperationalTelegramMessage(item: QueuedDispatch): string {
  return buildPremiumTelegramPayload(item).text;
}

export function buildRoundSummaryMessage(executed: ExecutedDispatch[]): string | null {
  if (executed.length < 2) return null;

  const lines = executed.slice(0, 8).map((e, i) => {
    const match = dispatchToContextMatch(e);
    const ctx = evaluateMatchContext(match);
    const dec = mapOperationalDecision(match, ctx);
    return `${i + 1}. ${e.matchLabel} · ${e.minute}' · ${dec.situacaoAtual} · conf. ${dec.confianca}%`;
  });

  return [
    ...buildAggregateHeader("round_summary"),
    "",
    formatTelegramSection(
      "PARTIDAS COM LEITURA ATIVA",
      sanitizeTelegramCopy(lines.join("\n"))
    ),
    "",
    formatTelegramSection(
      "SÍNTESE",
      `${executed.length} leituras operacionais registradas neste ciclo. Priorize partidas com selo de alerta ou oportunidade contextual.`
    ),
  ].join("\n");
}

export function buildTopMonitoredMessage(executed: ExecutedDispatch[]): string | null {
  const ranked = [...executed].sort((a, b) => b.priorityScore - a.priorityScore);
  if (ranked.length === 0) return null;

  const top = ranked.slice(0, 5);
  const lines = top.map((e, i) => {
    const match = dispatchToContextMatch(e);
    const dec = mapOperationalDecision(match, evaluateMatchContext(match));
    return `${i + 1}. ${e.matchLabel} · pressão ${Math.round(e.pressureScore)} · ${dec.selo}`;
  });

  return [
    ...buildAggregateHeader("top_monitored"),
    "",
    formatTelegramSection("RANKING OPERACIONAL", lines.join("\n")),
    "",
    "Critério: prioridade contextual e intensidade ofensiva consolidada.",
  ].join("\n");
}

export function buildMatchEndMessage(item: QueuedDispatch): string {
  const match = dispatchToContextMatch(item);
  const context = evaluateMatchContext(match);
  const decision = mapOperationalDecision(match, context);

  return [
    ...buildAggregateHeader("match_end"),
    "",
    formatTelegramSection("JOGO", `${item.homeTeam} x ${item.awayTeam}\n${item.scoreDisplay}`),
    "",
    formatTelegramSection("ENCERRAMENTO", "Partida finalizada — leitura operacional consolidada."),
    "",
    formatTelegramSection("SÍNTESE FINAL", context.narrativa),
    "",
    formatTelegramBulletList("INDICADORES FINAIS", [
      { label: "Pressão ofensiva", value: String(Math.round(item.pressureScore)) },
      { label: "Confiança da leitura", value: `${decision.confianca}%` },
      { label: "Risco final", value: decision.risco },
    ]),
    "",
    formatTelegramSection("STATUS", statusFromSelo(decision.selo, decision.acaoSugerida)),
  ].join("\n");
}

/** Compat: feed interno / snapshot */
export function buildInstitutionalDispatchMessage(item: QueuedDispatch): string {
  return buildPremiumOperationalTelegramMessage(item);
}

/** Alerta autônomo — cabeçalho institucional + corpo operacional premium. */
export function buildAutonomousAlertTelegramMessage(
  alertHeadline: string,
  item: QueuedDispatch
): string {
  const body = buildPremiumOperationalTelegramMessage(item);
  return [
    "GoalPressure AI",
    "Alertas autônomos · monitoramento contínuo",
    "────────────────────────",
    alertHeadline,
    "",
    body,
  ].join("\n");
}
