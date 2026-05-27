/**
 * Estado operacional visual do terminal — regras simples, sem IA/score sintético.
 */

import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import type { TimelineEventSummary } from "@/types/domain";
import { getSafeTerminalStats } from "@/lib/terminal/validatedStats";

export type TerminalOperationalState =
  | "neutral"
  | "heating_up"
  | "high_pressure"
  | "dangerous"
  | "low_tempo"
  | "finished"
  | "upcoming";

export interface OperationalCardView {
  state: TerminalOperationalState;
  chipLabel: string | null;
  cssModifier: string | null;
  microLine: string | null;
  sortRank: number;
}

const SORT_RANK: Record<TerminalOperationalState, number> = {
  dangerous: 0,
  high_pressure: 1,
  heating_up: 2,
  neutral: 3,
  low_tempo: 4,
  upcoming: 5,
  finished: 6,
};

const CHIP_LABELS: Partial<Record<TerminalOperationalState, string>> = {
  high_pressure: "PRESSÃO ALTA",
  heating_up: "AQUECENDO",
  dangerous: "OPORTUNIDADE",
  low_tempo: "JOGO LENTO",
};

const CSS_MODIFIERS: Partial<Record<TerminalOperationalState, string>> = {
  high_pressure: "op-high-pressure",
  heating_up: "op-heating-up",
  dangerous: "op-dangerous",
  low_tempo: "op-low-tempo",
  upcoming: "op-upcoming",
  finished: "op-finished",
};

function matchMinute(match: EnrichedLiveMatch): number | null {
  if (match.minute != null && Number.isFinite(match.minute)) return match.minute;
  const parsed = Number.parseInt(String(match.minuteLabel).replace(/\D/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function isDraw(match: EnrichedLiveMatch): boolean {
  return (
    match.scoreKnown &&
    match.homeScore != null &&
    match.awayScore != null &&
    match.homeScore === match.awayScore
  );
}

function isHighPressure(match: EnrichedLiveMatch): boolean {
  if (!match.isLive) return false;
  const minute = matchMinute(match);
  if (minute == null || minute < 55) return false;

  const safe = getSafeTerminalStats({ teamStats: match.teamStats ?? null });
  const da = safe.totalDangerousAttacks;
  const sot = safe.totalShotsOnTarget;
  const corners = safe.totalCorners;

  if (da == null || sot == null || corners == null) return false;
  return da >= 35 && sot >= 8 && corners >= 8;
}

function isHeatingUp(match: EnrichedLiveMatch): boolean {
  if (!match.isLive) return false;

  if (match.dangerousSequence) return true;
  if (match.pressureTrend === "RISING") return true;
  if (match.sportmonksMomentumDirection === "RISING") return true;
  if (match.steamMove || match.steamDirection === "DOWN") return true;

  const drift = match.oddsDrift;
  if (drift != null && drift <= -0.02) return true;

  const seq = (match.sequenceState ?? "").toUpperCase();
  if (
    seq.includes("PRESSURE") ||
    seq.includes("ATTACK") ||
    seq.includes("IGNITE") ||
    seq.includes("HOT") ||
    seq.includes("CHAOS")
  ) {
    return true;
  }

  return false;
}

function isDangerous(match: EnrichedLiveMatch): boolean {
  if (!match.isLive) return false;
  if (!isDraw(match)) return false;

  const pressureHigh = match.pressureScore >= 55 || isHighPressure(match);
  if (!pressureHigh) return false;

  const odd = match.marketOdd;
  if (odd == null || !Number.isFinite(odd) || odd < 1.05) return false;

  return odd >= 1.12;
}

function isLowTempo(match: EnrichedLiveMatch): boolean {
  if (!match.isLive) return false;
  if (isHighPressure(match) || isHeatingUp(match) || isDangerous(match)) return false;

  const safe = getSafeTerminalStats({ teamStats: match.teamStats ?? null });
  const da = safe.totalDangerousAttacks;
  const shots = safe.totalShots;
  const corners = safe.totalCorners;

  const fewAttacks = da != null && da < 12;
  const fewShots = shots != null && shots < 6;
  const fewCorners = corners != null && corners < 3;
  const lowPressure = match.pressureScore < 38;

  const recentCorners = countRecentTimelineEvents(match, isCornerEvent, 12);
  const noRecentCorners = recentCorners === 0;

  const slowPossession =
    safe.teamStats != null &&
    safe.teamStats.home.possession != null &&
    safe.teamStats.away.possession != null &&
    Math.abs(safe.teamStats.home.possession - safe.teamStats.away.possession) <= 12 &&
    safe.teamStats.home.possession >= 42 &&
    safe.teamStats.home.possession <= 58;

  const signals = [fewAttacks, fewShots, fewCorners, lowPressure, slowPossession];
  const hit = signals.filter(Boolean).length;
  if (hit >= 3) return true;
  if (fewAttacks && fewShots && (noRecentCorners || fewCorners)) return true;

  return false;
}

function isCornerEvent(ev: TimelineEventSummary): boolean {
  const t = ev.type.toLowerCase();
  return t.includes("escante") || t.includes("corner");
}

function countRecentTimelineEvents(
  match: EnrichedLiveMatch,
  predicate: (ev: TimelineEventSummary) => boolean,
  windowMinutes: number
): number | null {
  const current = matchMinute(match);
  const events = match.sportmonksTimeline;
  if (current == null || !events?.length) return null;

  const from = current - windowMinutes;
  let count = 0;
  for (const ev of events) {
    if (ev.minute >= from && ev.minute <= current && predicate(ev)) {
      count += 1;
    }
  }
  return count;
}

export function buildOperationalMicroLine(
  match: EnrichedLiveMatch,
  state: TerminalOperationalState
): string | null {
  if (match.marketOdd != null && match.previousMarketOdd != null) {
    const prev = match.previousMarketOdd;
    const cur = match.marketOdd;
    if (
      Number.isFinite(prev) &&
      Number.isFinite(cur) &&
      prev >= 1.05 &&
      cur >= 1.05 &&
      prev - cur >= 0.03
    ) {
      return `odd caiu ${prev.toFixed(2)} → ${cur.toFixed(2)}`;
    }
  }

  const recentCorners = countRecentTimelineEvents(match, isCornerEvent, 10);
  if (recentCorners != null && recentCorners >= 3) {
    return `${recentCorners} escanteios recentes`;
  }

  if (match.steamMove && match.oddsDrift != null && match.oddsDrift <= -0.02) {
    const pct = Math.abs(match.oddsDrift * 100).toFixed(0);
    return `odd em queda (${pct}% no mercado)`;
  }

  if (match.pressureTrend === "RISING" || match.sportmonksMomentumDirection === "RISING") {
    return "ritmo ofensivo em alta";
  }

  if (match.dangerousSequence && match.sequenceState) {
    return `sequência ofensiva: ${match.sequenceState.toLowerCase()}`;
  }

  if (state === "low_tempo") {
    return "ritmo ofensivo baixo";
  }

  return null;
}

export function getOperationalState(match: EnrichedLiveMatch): TerminalOperationalState {
  if (match.isFinished) return "finished";
  if (match.isPreMatch) return "upcoming";
  if (!match.isLive) return "neutral";

  if (isDangerous(match)) return "dangerous";
  if (isHighPressure(match)) return "high_pressure";
  if (isHeatingUp(match)) return "heating_up";
  if (isLowTempo(match)) return "low_tempo";

  return "neutral";
}

export function getOperationalCardView(match: EnrichedLiveMatch): OperationalCardView {
  const state = getOperationalState(match);
  return {
    state,
    chipLabel: CHIP_LABELS[state] ?? null,
    cssModifier: CSS_MODIFIERS[state] ?? null,
    microLine: buildOperationalMicroLine(match, state),
    sortRank: SORT_RANK[state],
  };
}

export function compareOperationalPriority(
  a: EnrichedLiveMatch,
  b: EnrichedLiveMatch
): number {
  const ra = SORT_RANK[getOperationalState(a)];
  const rb = SORT_RANK[getOperationalState(b)];
  if (ra !== rb) return ra - rb;

  if (a.isLive && b.isLive) {
    const byPressure = b.pressureScore - a.pressureScore;
    if (byPressure !== 0) return byPressure;
  }

  if (a.isPreMatch && b.isPreMatch) {
    const ta = a.startingAtTimestamp ?? 0;
    const tb = b.startingAtTimestamp ?? 0;
    return ta - tb;
  }

  return 0;
}

export function sortMatchesByOperationalPriority(
  matches: EnrichedLiveMatch[]
): EnrichedLiveMatch[] {
  return [...matches].sort(compareOperationalPriority);
}
