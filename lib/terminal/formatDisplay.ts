/** Formatação visual para o terminal — sem alterar dados de engine/API. */

export function roundDisplay(value: number | null | undefined, decimals = 0): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const factor = 10 ** decimals;
  return String(Math.round(value * factor) / factor);
}

export function formatPercentDisplay(
  value: number | null | undefined,
  decimals = 1
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const n = Math.abs(value) <= 1 && value !== 0 ? value * 100 : value;
  return `${n.toFixed(decimals)}%`;
}

export function formatSignedDisplay(
  value: number | null | undefined,
  decimals = 1
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const n = Math.round(value * 10 ** decimals) / 10 ** decimals;
  return `${n > 0 ? "+" : ""}${n.toFixed(decimals)}`;
}

const REGIME_PT: Record<string, string> = {
  NEUTRAL: "Neutro",
  PRESSURE: "Pressão",
  CHAOS: "Caos",
  EXECUTE: "Execução",
  WATCH: "Observação",
  HOT: "Quente",
  IGNITE: "Ignição",
  STABLE: "Estável",
  VOLATILE: "Volátil",
};

export function translateRegimeLabel(raw: string | null | undefined): string {
  if (!raw?.trim()) return "Neutro";
  const key = raw.trim().toUpperCase().replace(/\s+/g, "_");
  return REGIME_PT[key] ?? raw.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function humanizeSignalLabel(raw: string | null | undefined): string {
  if (!raw?.trim()) return "—";
  const t = raw.trim();
  if (REGIME_PT[t.toUpperCase()]) return REGIME_PT[t.toUpperCase()];
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const MARKET_PT: Record<string, string> = {
  "1X2": "Resultado final",
  FT_1X2: "Resultado final",
  OVER_UNDER: "Mais/menos gols",
  OVER_15: "Mais de 1,5 gols",
  OVER_25: "Mais de 2,5 gols",
  BTTS: "Ambas marcam",
  ASIAN_HANDICAP: "Handicap asiático",
};

export function marketLabelPt(raw: string | null | undefined): string {
  if (!raw?.trim()) return "Mercado";
  const key = raw.trim().toUpperCase().replace(/\s+/g, "_");
  if (MARKET_PT[key]) return MARKET_PT[key];
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bOdd\b/gi, "cotação");
}

export function feedStatusLabel(status: string): string {
  const map: Record<string, string> = {
    loading: "Carregando",
    live: "Ao vivo",
    stale: "Desatualizado",
    error: "Erro",
    empty: "Sem jogos",
  };
  return map[status] ?? status;
}

export function opsStatusLabel(status: string): string {
  const map: Record<string, string> = {
    ok: "Operacional",
    degraded: "Parcial",
    error: "Indisponível",
    offline: "Offline",
  };
  return map[status.toLowerCase()] ?? status;
}
