/**
 * Helpers visuais dos cards do terminal — somente dados reais do feed.
 */

import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { formatUpcomingCardKickoffLabel } from "@/lib/terminal/upcomingKickoffLabel";

export type CardStatusTone = "live" | "scheduled" | "finished" | "default";

export interface CardMetricChip {
  id: string;
  label: string;
  value: string;
}

export interface CardOddsLine {
  home: string | null;
  away: string | null;
  marketFavorite: "home" | "away" | null;
}

function formatOdd(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value) || value <= 1.01) return null;
  return value.toFixed(2);
}

export function cardStatusTone(match: EnrichedLiveMatch): CardStatusTone {
  if (match.isLive) return "live";
  if (match.isPreMatch) return "scheduled";
  if (match.isFinished) return "finished";
  return "default";
}

export function cardStatusLabel(
  match: EnrichedLiveMatch,
  options?: { upcomingSmartDate?: boolean }
): string {
  if (match.isLive) return match.minuteLabel || "Ao vivo";
  if (match.isPreMatch) {
    if (options?.upcomingSmartDate) {
      const smart = formatUpcomingCardKickoffLabel(
        match.startingAt,
        match.startingAtTimestamp
      );
      if (smart) return smart;
    }
    return match.kickoffLabel ? match.kickoffLabel : "Agendado";
  }
  if (match.isFinished) return "Encerrado";
  return match.minuteLabel || "";
}

/** Prioridade para card em destaque (2 colunas). */
export function scoreMatchPriority(match: EnrichedLiveMatch): number {
  let score = 0;
  if (match.isLive) score += 1_000;
  if (match.isLive && match.pressureScore > 0) {
    score += match.pressureScore * 2;
  }
  if (match.steamMove) score += 120;
  const drift = Math.abs(match.oddsDrift ?? 0);
  if (drift >= 0.05) score += 80 + drift * 200;
  else if (drift >= 0.02) score += 40;
  if ((match.dispatchPriority ?? 0) > 0) {
    score += Math.min(100, match.dispatchPriority ?? 0);
  }
  if (match.evPlus) score += 30;
  return score;
}

export function pickFeaturedMatch(
  matches: EnrichedLiveMatch[]
): EnrichedLiveMatch | null {
  if (matches.length === 0) return null;

  let best: EnrichedLiveMatch | null = null;
  let bestScore = -1;

  for (const m of matches) {
    const s = scoreMatchPriority(m);
    if (s > bestScore) {
      bestScore = s;
      best = m;
    }
  }

  if (!best || bestScore < 400) return null;
  return best;
}

export function isHighlightMatch(match: EnrichedLiveMatch): boolean {
  if (!match.isLive) return false;
  if (match.pressureScore >= 68) return true;
  if (match.steamMove) return true;
  if (Math.abs(match.oddsDrift ?? 0) >= 0.04) return true;
  return false;
}

export function buildCardOdds(match: EnrichedLiveMatch): CardOddsLine | null {
  const home = formatOdd(match.odds.primary);
  const away =
    formatOdd(match.odds.fullTimeResult) ?? formatOdd(match.odds.over15);

  if (!home && !away) return null;

  const nums: { side: "home" | "away"; v: number }[] = [];
  if (home) nums.push({ side: "home", v: Number(home) });
  if (away) nums.push({ side: "away", v: Number(away) });
  const min = nums.length ? nums.reduce((a, b) => (a.v <= b.v ? a : b)) : null;

  return {
    home,
    away,
    marketFavorite: min?.side ?? null,
  };
}

export function buildCardMetricChips(match: EnrichedLiveMatch): CardMetricChip[] {
  const chips: CardMetricChip[] = [];

  if (match.isLive && match.pressureScore > 0) {
    chips.push({
      id: "pressure",
      label: "Pressão",
      value: String(Math.round(match.pressureScore)),
    });
  }

  if (match.isLive && match.dangerousAttacks > 0) {
    chips.push({
      id: "da",
      label: "Ataq. perig.",
      value: String(Math.round(match.dangerousAttacks)),
    });
  }

  if (match.corners > 0) {
    chips.push({
      id: "corners",
      label: "Escanteios",
      value: String(Math.round(match.corners)),
    });
  }

  if (match.shots > 0) {
    chips.push({
      id: "shots",
      label: "Finaliz.",
      value: String(Math.round(match.shots)),
    });
  }

  if (
    match.possession != null &&
    Number.isFinite(match.possession) &&
    match.possession > 0 &&
    match.possession < 100
  ) {
    chips.push({
      id: "pos",
      label: "Posse",
      value: `${Math.round(match.possession)}%`,
    });
  }

  return chips;
}
