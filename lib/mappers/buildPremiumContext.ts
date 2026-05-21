/**
 * Builds MatchPremiumContext from SportMonks Growth payload — all optional, never throws.
 */

import type { SportmonksFixture } from "@/lib/mappers/sportmonks";
import {
  getFixtureEvents,
  resolveAllFixtureOdds,
  sumXgFromFixture,
  type SportmonksEvent,
} from "@/lib/mappers/sportmonksPremium";
import type { MatchPremiumContext, MatchStats, MatchTeamStats, TimelineEventSummary } from "@/types/domain";

function safeNum(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const p = Number.parseFloat(v);
    if (Number.isFinite(p)) return p;
  }
  return fallback;
}

function resolveSide(
  participantId: number | undefined,
  homeId?: number,
  awayId?: number
): "home" | "away" | undefined {
  if (participantId == null) return undefined;
  if (homeId != null && participantId === homeId) return "home";
  if (awayId != null && participantId === awayId) return "away";
  return undefined;
}

function parseTimelineEvents(
  fixture: SportmonksFixture,
  homeId?: number,
  awayId?: number
): TimelineEventSummary[] {
  try {
    const events = getFixtureEvents(fixture);
    return events
      .slice(0, 24)
      .map((ev) => ({
        minute: safeNum(ev.minute, 0),
        type:
          ev.type?.developer_name ??
          ev.type?.name ??
          ev.type?.code ??
          "EVENT",
        side: resolveSide(ev.participant_id, homeId, awayId),
      }))
      .sort((a, b) => a.minute - b.minute);
  } catch {
    return [];
  }
}

function countBookmakers(fixture: SportmonksFixture): number {
  try {
    const odds = resolveAllFixtureOdds(fixture);
    const ids = new Set<number | string>();
    for (const o of odds) {
      if (o.bookmaker_id != null) ids.add(o.bookmaker_id);
    }
    return ids.size > 0 ? ids.size : odds.length > 0 ? 1 : 0;
  } catch {
    return 0;
  }
}

function momentumFromTrends(fixture: SportmonksFixture): number {
  try {
    const trends = (fixture as SportmonksFixture & { trends?: Record<string, unknown>[] })
      .trends;
    if (!Array.isArray(trends) || trends.length === 0) return 0;
    let sum = 0;
    let n = 0;
    for (const t of trends) {
      const v = safeNum(t.value ?? t.data, NaN);
      if (Number.isFinite(v)) {
        sum += v;
        n += 1;
      }
    }
    if (n === 0) return Math.min(100, trends.length * 8);
    return Math.min(100, Math.round(sum / n));
  } catch {
    return 0;
  }
}

function pressureIndexFromFixture(
  fixture: SportmonksFixture,
  stats: MatchStats
): number | null {
  try {
    const coords = (fixture as SportmonksFixture & {
      ballCoordinates?: { pressure?: number; value?: number }[];
      pressure?: { value?: number }[];
    }).ballCoordinates;

    if (Array.isArray(coords) && coords.length > 0) {
      const last = coords[coords.length - 1];
      const p = safeNum(last?.pressure ?? last?.value, NaN);
      if (Number.isFinite(p) && p > 0) return Math.min(100, Math.round(p));
    }

    const pressureArr = (fixture as SportmonksFixture & { pressure?: { value?: number }[] })
      .pressure;
    if (Array.isArray(pressureArr) && pressureArr.length > 0) {
      const p = safeNum(pressureArr[pressureArr.length - 1]?.value, NaN);
      if (Number.isFinite(p) && p > 0) return Math.min(100, Math.round(p));
    }

    const da = stats.dangerousAttacks;
    const sot = stats.shotsOnTarget;
    if (da > 0 || sot > 0) {
      return Math.min(100, Math.round(da * 2.2 + sot * 4 + (stats.xG ?? 0) * 12));
    }
    return null;
  } catch {
    return null;
  }
}

function buildDominanceLabel(
  teamStats: MatchTeamStats | undefined,
  stats: MatchStats
): string {
  try {
    const homeP = teamStats?.home.possession ?? stats.possession ?? 50;
    const awayP = teamStats?.away.possession ?? 100 - homeP;
    if (homeP - awayP >= 10) return `HOME ${Math.round(homeP)}%`;
    if (awayP - homeP >= 10) return `AWAY ${Math.round(awayP)}%`;
    return "BALANCED";
  } catch {
    return "BALANCED";
  }
}

function detectDangerousSequence(
  events: TimelineEventSummary[],
  stats: MatchStats,
  momentum: number
): boolean {
  try {
    const recentDanger = events.filter((e) => {
      const t = e.type.toUpperCase();
      return (
        t.includes("GOAL") ||
        t.includes("SHOT") ||
        t.includes("ATTACK") ||
        t.includes("CORNER")
      );
    });
    if (recentDanger.length >= 3) return true;
    if (stats.dangerousAttacks >= 15 && momentum >= 55) return true;
    return false;
  } catch {
    return false;
  }
}

export function buildPremiumContext(
  fixture: SportmonksFixture,
  stats: MatchStats,
  teamStats?: MatchTeamStats
): MatchPremiumContext {
  const defaults: MatchPremiumContext = {
    timelineEvents: [],
    timelineEventsCount: 0,
    momentumScore: 0,
    pressureIndex: null,
    dominanceLabel: "BALANCED",
    dangerousSequence: false,
    bookmakersCount: 0,
    standingsAvailable: false,
    xgAvailable: false,
    oddsAvailable: false,
    eventsAvailable: false,
    lineupsAvailable: false,
    statisticsAvailable: false,
  };

  try {
    const participants = fixture.participants ?? [];
    const homeId = participants.find((p) => p.meta?.location === "home")?.id;
    const awayId = participants.find((p) => p.meta?.location === "away")?.id;

    let timelineEvents = parseTimelineEvents(fixture, homeId, awayId);
    const timelineRaw = (fixture as SportmonksFixture & { timeline?: SportmonksEvent[] })
      .timeline;
    if (Array.isArray(timelineRaw) && timelineRaw.length > timelineEvents.length) {
      timelineEvents = parseTimelineEvents(
        { ...fixture, events: timelineRaw },
        homeId,
        awayId
      );
    }
    const momentumScore = momentumFromTrends(fixture);
    const pressureIndex = pressureIndexFromFixture(fixture, stats);
    const dominanceLabel = buildDominanceLabel(teamStats, stats);
    const dangerousSequence = detectDangerousSequence(timelineEvents, stats, momentumScore);

    const f = fixture as SportmonksFixture & {
      lineups?: unknown[];
      standings?: unknown;
    };

    return {
      timelineEvents,
      timelineEventsCount: timelineEvents.length,
      momentumScore,
      pressureIndex,
      dominanceLabel,
      dangerousSequence,
      bookmakersCount: countBookmakers(fixture),
      standingsAvailable: f.standings != null,
      xgAvailable: sumXgFromFixture(fixture) > 0 || (stats.xG ?? 0) > 0,
      oddsAvailable: resolveAllFixtureOdds(fixture).length > 0,
      eventsAvailable: getFixtureEvents(fixture).length > 0,
      lineupsAvailable: Array.isArray(f.lineups) && f.lineups.length > 0,
      statisticsAvailable: (fixture.statistics?.length ?? 0) > 0,
    };
  } catch {
    return defaults;
  }
}
