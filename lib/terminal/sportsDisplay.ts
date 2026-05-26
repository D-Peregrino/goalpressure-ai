import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import {
  formatPercentDisplay,
  formatSignedDisplay,
  roundDisplay,
  translateRegimeLabel,
} from "@/lib/terminal/formatDisplay";

export function formatPair(home: number | null | undefined, away: number | null | undefined): string {
  const h = home != null && Number.isFinite(home) ? Math.round(home) : null;
  const a = away != null && Number.isFinite(away) ? Math.round(away) : null;
  if (h == null && a == null) return "—";
  if (h == null) return `— - ${a}`;
  if (a == null) return `${h} - —`;
  return `${h} - ${a}`;
}

/** Posse: valor no match é % do mandante quando disponível. */
export function possessionPair(match: EnrichedLiveMatch): string {
  if (match.possession == null || !Number.isFinite(match.possession)) return "—";
  const home = Math.round(match.possession);
  const away = Math.max(0, Math.min(100, 100 - home));
  return `${home}% - ${away}%`;
}

export function pressurePair(match: EnrichedLiveMatch): string {
  return formatPair(Math.round(match.homePressure), Math.round(match.awayPressure));
}

export function evDisplay(match: EnrichedLiveMatch): string {
  return formatPercentDisplay(match.ev);
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

export function footerMetrics(match: EnrichedLiveMatch) {
  return [
    { label: "Pressão ofensiva", value: roundDisplay(match.pressureScore) },
    { label: "Momento ofensivo", value: formatSignedDisplay(match.momentum) },
    { label: "Valor esperado", value: evDisplay(match) },
    { label: "Caos do jogo", value: roundDisplay(match.chaosIndex) },
    { label: "Distorção de odd", value: formatPercentDisplay(match.edgePercent) },
    { label: "Confiança", value: `${roundDisplay(match.confidence)}%` },
    { label: "Regime", value: translateRegimeLabel(match.operationalState) },
  ];
}

export function leagueLine(match: EnrichedLiveMatch): string {
  const parts = [match.league, match.round].filter(Boolean);
  return parts.join(" · ") || "Competição";
}
