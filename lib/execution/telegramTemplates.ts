/**
 * Templates institucionais Telegram — somente apresentação (sem cálculos).
 */

export type TelegramVisualLevel =
  | "neutro"
  | "monitoramento"
  | "alerta"
  | "oportunidade"
  | "critico"
  | "evitar";

export type TelegramMessageKind =
  | "contextual_reading"
  | "round_summary"
  | "top_monitored"
  | "match_end";

export interface TelegramTemplateAccent {
  level: TelegramVisualLevel;
  /** Linha de destaque no topo do corpo */
  rail: string;
  /** Título do header secundário */
  headerSubtitle: string;
}

const ACCENTS: Record<TelegramVisualLevel, TelegramTemplateAccent> = {
  neutro: {
    level: "neutro",
    rail: "────────────────────────",
    headerSubtitle: "Leitura contextual",
  },
  monitoramento: {
    level: "monitoramento",
    rail: "────────── · MONITORAMENTO",
    headerSubtitle: "Leitura contextual em monitoramento",
  },
  alerta: {
    level: "alerta",
    rail: "────────── ▌ ALERTA OPERACIONAL",
    headerSubtitle: "Leitura contextual detectada",
  },
  oportunidade: {
    level: "oportunidade",
    rail: "────────── ▌ OPORTUNIDADE CONTEXTUAL",
    headerSubtitle: "Leitura contextual detectada",
  },
  critico: {
    level: "critico",
    rail: "══════════ ▌ CONTEXTO CRÍTICO",
    headerSubtitle: "Leitura contextual prioritária",
  },
  evitar: {
    level: "evitar",
    rail: "────────── ▌ LEITURA DEFENSIVA",
    headerSubtitle: "Contexto de cautela operacional",
  },
};

export function getTelegramAccent(level: TelegramVisualLevel): TelegramTemplateAccent {
  return ACCENTS[level];
}

export const TELEGRAM_BRAND = "GoalPressure AI";

export const TELEGRAM_FORBIDDEN_TERMS = [
  "GREEN",
  "ENTRADA CERTA",
  "MASSACRE",
  "WIN",
  "TIPSTER",
] as const;

export function sanitizeTelegramCopy(text: string): string {
  let out = text;
  for (const term of TELEGRAM_FORBIDDEN_TERMS) {
    out = out.replace(new RegExp(term, "gi"), "");
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

export function formatTelegramSection(title: string, body: string): string {
  const clean = sanitizeTelegramCopy(body);
  if (!clean) return `${title}\n—`;
  return `${title}\n${clean}`;
}

export function formatTelegramBulletList(
  title: string,
  lines: { label: string; value: string }[]
): string {
  const rows = lines
    .map((l) => `- ${l.label}: ${sanitizeTelegramCopy(l.value)}`)
    .join("\n");
  return `${title}\n${rows}`;
}

/** Cabeçalho padrão de leitura contextual ao vivo */
export function buildContextualHeader(accent: TelegramTemplateAccent): string[] {
  return [TELEGRAM_BRAND, accent.headerSubtitle, accent.rail];
}

/** Cabeçalhos de mensagens agregadas */
export function buildAggregateHeader(kind: TelegramMessageKind): string[] {
  switch (kind) {
    case "round_summary":
      return [TELEGRAM_BRAND, "Resumo operacional da rodada", "────────────────────────"];
    case "top_monitored":
      return [TELEGRAM_BRAND, "Top jogos monitorados", "────────────────────────"];
    case "match_end":
      return [TELEGRAM_BRAND, "Encerramento da partida", "────────────────────────"];
    default:
      return [TELEGRAM_BRAND, "Leitura operacional", "────────────────────────"];
  }
}

const MARKET_PT: Record<string, string> = {
  OVER_0_5: "Mais de 0,5 gol",
  OVER_05: "Mais de 0,5 gol",
  OVER_1_5: "Mais de 1,5 gols",
  OVER_15: "Mais de 1,5 gols",
  OVER_2_5: "Mais de 2,5 gols",
  OVER_25: "Mais de 2,5 gols",
  BTTS: "Ambas marcam",
  "1X2": "Resultado final",
  OPS: "Contexto operacional",
  CONTEXT: "Contexto tático",
};

export function formatMonitoredMarket(market: string): string {
  const key = market.trim().toUpperCase().replace(/\s+/g, "_");
  if (MARKET_PT[key]) return MARKET_PT[key];
  return market
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/Over/gi, "Mais de")
    .replace(/Under/gi, "Menos de");
}

export function mapUrgencyToVisualLevel(
  urgency: string,
  selo: string,
  contextLevel: string
): TelegramVisualLevel {
  if (selo === "EVITAR") return "evitar";
  if (selo === "OPORTUNIDADE" || contextLevel === "oportunidade_ev") return "oportunidade";
  if (
    selo === "ALERTA" ||
    urgency === "CRITICAL" ||
    contextLevel === "zona_critica"
  ) {
    return urgency === "CRITICAL" || contextLevel === "zona_critica" ? "critico" : "alerta";
  }
  if (selo === "ACOMPANHAR" || contextLevel === "monitoramento" || contextLevel === "pressao_crescente") {
    return "monitoramento";
  }
  return "neutro";
}

export function distortionLabel(edgePercent: number | null | undefined): string {
  const v = Math.abs(edgePercent ?? 0);
  if (v >= 7) return "Elevada";
  if (v >= 4) return "Moderada";
  if (v >= 1.5) return "Leve";
  return "Estável";
}
