import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import type { MatchContextResult } from "@/components/terminal/intelligence/ContextEngine";
import { getPressureScoreHistory } from "@/lib/engine/pressure/rollingWindow";
import type { TimelineWindow } from "@/lib/terminal/sportsDisplay";

export interface TimelineBarPoint {
  minute: number;
  home: number;
  away: number;
  awayNegative: number;
  total: number;
}

export interface TimelineEventPoint {
  minute: number;
  kind:
    | "pressao_crescente"
    | "zona_critica"
    | "desaceleracao"
    | "oportunidade_valor"
    | "mercado_atrasado"
    | "escanteios_sequencia"
    | "transicao_rapida";
  label: string;
  detail: string;
}

const clampMinute = (n: number) => Math.max(1, Math.min(90, Math.round(n)));

function parseMinute(raw: string): number | null {
  const m = raw.match(/(\d+)/);
  if (!m) return null;
  return clampMinute(Number(m[1]));
}

function toWindow(points: TimelineBarPoint[], window: TimelineWindow, currentMinute: number): TimelineBarPoint[] {
  if (window === "total") return points;
  const span = window === "10" ? 10 : 5;
  const minMinute = Math.max(1, currentMinute - span);
  return points.filter((p) => p.minute >= minMinute);
}

export function mapTimelineBars(
  match: EnrichedLiveMatch,
  window: TimelineWindow
): TimelineBarPoint[] {
  const history = getPressureScoreHistory(match.matchId);
  if (history.length < 2) return [];

  const currentMinute = clampMinute(match.minute ?? 90);
  const startMinute = Math.max(1, currentMinute - (history.length - 1));

  const points = history.map((score, idx) => {
    const minute = clampMinute(startMinute + idx);
    const total = Math.max(0, Math.round(score));
    const homeShare = match.homePressure / Math.max(1, match.homePressure + match.awayPressure);
    const home = Math.round(total * homeShare);
    const away = Math.max(0, total - home);
    return { minute, home, away, awayNegative: -away, total };
  });

  return toWindow(points, window, currentMinute);
}

export function mapTimelineEvents(
  match: EnrichedLiveMatch,
  context: MatchContextResult,
  bars: TimelineBarPoint[]
): TimelineEventPoint[] {
  const fallbackMinute = clampMinute(match.minute ?? 45);
  const out: TimelineEventPoint[] = [];

  for (const h of context.historico) {
    const minute = parseMinute(h.minute) ?? fallbackMinute;
    const label = h.label.toLowerCase();
    if (label.includes("pressão crescente")) {
      out.push({
        minute,
        kind: "pressao_crescente",
        label: "Pressão crescente",
        detail: `${minute}' · Pressão crescente · Ataques perigosos aumentaram nos últimos minutos.`,
      });
    } else if (label.includes("pressão extrema")) {
      out.push({
        minute,
        kind: "zona_critica",
        label: "Zona crítica",
        detail: `${minute}' · Zona crítica · Intensidade ofensiva em patamar elevado.`,
      });
    } else if (label.includes("desaceleração")) {
      out.push({
        minute,
        kind: "desaceleracao",
        label: "Desaceleração",
        detail: `${minute}' · Desaceleração · Ritmo ofensivo perdeu força recentemente.`,
      });
    } else if (label.includes("mercado atrasado")) {
      out.push({
        minute,
        kind: "mercado_atrasado",
        label: "Mercado atrasado",
        detail: `${minute}' · Mercado atrasado · Contexto de campo acima da reação de preço.`,
      });
    }
  }

  if (context.level === "oportunidade_ev") {
    out.push({
      minute: fallbackMinute,
      kind: "oportunidade_valor",
      label: "Oportunidade de valor",
      detail: `${fallbackMinute}' · Oportunidade de valor · Distância entre contexto e preço observada.`,
    });
  }

  if ((match.engineAccelerationScore ?? 0) >= 60) {
    out.push({
      minute: fallbackMinute,
      kind: "transicao_rapida",
      label: "Transição rápida",
      detail: `${fallbackMinute}' · Transição rápida · Aceleração ofensiva acima da média da partida.`,
    });
  }

  if (match.corners >= 6) {
    out.push({
      minute: Math.max(1, fallbackMinute - 2),
      kind: "escanteios_sequencia",
      label: "Escanteios em sequência",
      detail: `${Math.max(1, fallbackMinute - 2)}' · Escanteios em sequência · Pressão por bolas paradas.`,
    });
  }

  const minVisible = bars.length > 0 ? bars[0].minute : 1;
  const dedup = new Map<string, TimelineEventPoint>();
  for (const ev of out) {
    if (ev.minute < minVisible) continue;
    dedup.set(`${ev.kind}-${ev.minute}`, ev);
  }
  return [...dedup.values()].sort((a, b) => a.minute - b.minute).slice(-8);
}
