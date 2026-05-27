import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import {
  formatPercentDisplay,
  formatSignedDisplay,
  roundDisplay,
  translateRegimeLabel,
} from "@/lib/terminal/formatDisplay";

export type TimelineWindow = "total" | "10" | "5";

export interface SportsMetricBox {
  id: string;
  title: string;
  value: string;
  hint: string;
  tooltip: string;
}

export function formatPair(
  home: number | null | undefined,
  away: number | null | undefined,
  suffix = ""
): string {
  const h = home != null && Number.isFinite(home) ? Math.round(home) : null;
  const a = away != null && Number.isFinite(away) ? Math.round(away) : null;
  if (h == null && a == null) return "—";
  if (h == null) return `— × ${a}${suffix}`;
  if (a == null) return `${h}${suffix} × —`;
  return `${h}${suffix} × ${a}${suffix}`;
}

export function homeAwayShare(match: EnrichedLiveMatch): { home: number; away: number } {
  const sum = Math.max(1, match.homePressure + match.awayPressure);
  return { home: match.homePressure / sum, away: match.awayPressure / sum };
}

/** Reparte estatística agregada proporcional à pressão ofensiva (quando não há split por time no feed). */
export function splitAggregate(
  total: number,
  match: EnrichedLiveMatch
): [number | null, number | null] {
  if (!Number.isFinite(total) || total < 0) return [null, null];
  if (total === 0) return [0, 0];
  const share = homeAwayShare(match);
  const home = Math.round(total * share.home);
  const away = Math.max(0, Math.round(total) - home);
  return [home, away];
}

export function possessionPair(match: EnrichedLiveMatch): string {
  if (match.possession == null || !Number.isFinite(match.possession)) return "—";
  const home = Math.round(match.possession);
  const away = Math.max(0, Math.min(100, 100 - home));
  return formatPair(home, away, "%");
}

export function pressurePair(match: EnrichedLiveMatch): string {
  return formatPair(Math.round(match.homePressure), Math.round(match.awayPressure));
}

export function momentumPair(match: EnrichedLiveMatch): string {
  if (!Number.isFinite(match.momentum) || match.momentum === 0) return "—";
  const share = homeAwayShare(match);
  const mag = Math.abs(match.momentum);
  const home = Math.round(mag * share.home);
  const away = Math.max(0, Math.round(mag) - home);
  return formatPair(home, away);
}

export function evDisplay(match: EnrichedLiveMatch): string {
  return formatPercentDisplay(match.ev);
}

function hasPairValue(value: string): boolean {
  if (!value || value === "—") return false;
  if (value.includes("— × —")) return false;
  return true;
}

export function buildMatchMetricBoxes(match: EnrichedLiveMatch): SportsMetricBox[] {
  if (!match.isLive) return [];

  const [shotsH, shotsA] = splitAggregate(match.shots, match);
  const [sotH, sotA] = splitAggregate(match.shotsOnTarget, match);
  const [daH, daA] = splitAggregate(match.dangerousAttacks, match);
  const [cornersH, cornersA] = splitAggregate(match.corners, match);

  const boxes: SportsMetricBox[] = [
    {
      id: "shots",
      title: "Finalizações",
      value: formatPair(shotsH, shotsA),
      hint: "Mandante × visitante",
      tooltip: "Total de finalizações repartido pela leitura de pressão ofensiva.",
    },
    {
      id: "sot",
      title: "Finalizações no alvo",
      value: formatPair(sotH, sotA),
      hint: "Chutes entre as traves",
      tooltip: "Finalizações que chegaram ao gol.",
    },
    {
      id: "dangerous",
      title: "Ataques perigosos",
      value: formatPair(daH, daA),
      hint: "Aproximações de risco",
      tooltip: "Sequências ofensivas com potencial de gol.",
    },
    {
      id: "corners",
      title: "Escanteios",
      value: formatPair(cornersH, cornersA),
      hint: "Bolas paradas laterais",
      tooltip: "Escanteios a favor de cada equipe.",
    },
    {
      id: "possession",
      title: "Posse de bola",
      value: possessionPair(match),
      hint: "Percentual no jogo",
      tooltip: "Percentual de posse estimado para mandante e visitante.",
    },
    {
      id: "pressure",
      title: "Pressão ofensiva",
      value: pressurePair(match),
      hint: "Índice por equipe",
      tooltip: "Pressão ofensiva calculada em tempo real para cada lado.",
    },
    {
      id: "momentum",
      title: "Momento ofensivo",
      value: momentumPair(match),
      hint: "Ritmo recente",
      tooltip: "Momento ofensivo repartido conforme a dominância recente.",
    },
  ];

  const hasStat = (total: number) => Number.isFinite(total) && total > 0;

  return boxes.filter((box) => {
    if (box.id === "possession") {
      return match.possession != null && Number.isFinite(match.possession);
    }
    if (box.id === "shots") return hasStat(match.shots) && hasPairValue(box.value);
    if (box.id === "sot") return hasStat(match.shotsOnTarget) && hasPairValue(box.value);
    if (box.id === "dangerous") return hasStat(match.dangerousAttacks) && hasPairValue(box.value);
    if (box.id === "corners") return hasStat(match.corners) && hasPairValue(box.value);
    if (box.id === "pressure") return match.pressureScore > 0 && hasPairValue(box.value);
    if (box.id === "momentum") return match.momentum !== 0 && hasPairValue(box.value);
    return hasPairValue(box.value);
  });
}

export function pressureFieldLabel(match: EnrichedLiveMatch): string {
  if (!match.isLive && match.isPreMatch) return "Aguardando início da partida";
  if (match.dangerousSequence || match.dangerousAttacks > 0) return "Ataque perigoso";
  if (match.pressureScore >= 65) return "Pressão ofensiva";
  if (match.engineTerritorialScore && match.engineTerritorialScore >= 55) {
    return "Domínio territorial";
  }
  if (match.pressureScore < 20 && match.isLive) return "Aguardando pressão ofensiva";
  if (match.isLive) return "Jogo equilibrado";
  return "Aguardando pressão ofensiva";
}

export function pressureZoneSide(
  match: EnrichedLiveMatch
): "home" | "away" | "balanced" {
  if (match.pressureScore < 15) return "balanced";
  if (match.homePressure > match.awayPressure + 8) return "home";
  if (match.awayPressure > match.homePressure + 8) return "away";
  if (match.dominantSide === "home") return "home";
  if (match.dominantSide === "away") return "away";
  return "balanced";
}

function footerValueOk(value: string): boolean {
  if (!value || value === "—" || value === "—%") return false;
  return true;
}

export function footerMetrics(match: EnrichedLiveMatch) {
  if (!match.isLive) return [];

  const items = [
    {
      label: "Pressão ofensiva",
      value: roundDisplay(match.pressureScore),
      hint: "Índice geral da partida",
    },
    {
      label: "Momento ofensivo",
      value: formatSignedDisplay(match.momentum),
      hint: "Tendência recente",
    },
    {
      label: "Valor esperado",
      value: evDisplay(match),
      hint: "Leitura de valor",
    },
    {
      label: "Caos do jogo",
      value: roundDisplay(match.chaosIndex),
      hint: "Volatilidade tática",
    },
    {
      label: "Distorção de cotação",
      value: formatPercentDisplay(match.edgePercent),
      hint: "Diferença em relação à cotação de referência",
    },
    {
      label: "Confiança",
      value: `${roundDisplay(match.confidence)}%`,
      hint: "Qualidade da leitura",
    },
    {
      label: "Regime",
      value: translateRegimeLabel(match.operationalState),
      hint: "Estado operacional",
    },
  ];

  return items.filter((item) => footerValueOk(item.value));
}

export function leagueLine(match: EnrichedLiveMatch): string {
  const parts = [match.league, match.round].filter(Boolean);
  return parts.join(" · ") || "Competição";
}
