/**
 * SportMonks Growth feed parsers — real provider data only (no synthetic inference).
 * @see https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/livescores/get-inplay-livescores
 */

import type { SportmonksFixture } from "@/lib/mappers/sportmonks";
import {
  getFixtureEvents,
  getFixtureXg,
  resolveAllFixtureOdds,
  sumXgFromFixture,
  type SportmonksEvent,
} from "@/lib/mappers/sportmonksPremium";
import type {
  CommentaryLine,
  MatchPremiumContext,
  PressureTrend,
  SportmonksFeedSources,
  TimelineEventSummary,
} from "@/types/domain";

export interface SportmonksComment {
  id?: number;
  fixture_id?: number;
  comment?: string;
  minute?: number;
  extra_minute?: number | null;
  is_goal?: boolean;
  is_important?: boolean;
  order?: number;
}

export interface SportmonksTrendPoint {
  id?: number;
  fixture_id?: number;
  participant_id?: number;
  type_id?: number;
  minute?: number;
  value?: number | string | null;
  data?: { value?: number | string | null };
  type?: { name?: string; code?: string; developer_name?: string };
}

export interface SportmonksTimelineEntry {
  id?: number;
  fixture_id?: number;
  participant_id?: number;
  type_id?: number;
  minute?: number;
  extra_minute?: number | null;
  type?: { name?: string; code?: string; developer_name?: string };
  section?: string;
  addition?: string;
  info?: string;
  result?: string;
}

export interface SportmonksMomentumParse {
  score: number;
  direction: PressureTrend;
  series: { minute: number; value: number }[];
  fromProvider: boolean;
}

export interface SportmonksAdvancedOddsMeta {
  inplayCount: number;
  premiumCount: number;
  bookmakerCount: number;
  marketCount: number;
}

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

function eventTypeLabel(ev: SportmonksEvent | SportmonksTimelineEntry): string {
  return (
    ev.type?.developer_name ??
    ev.type?.name ??
    ev.type?.code ??
    "EVENT"
  );
}

export function getFixtureComments(fixture: SportmonksFixture): SportmonksComment[] {
  const raw = (fixture as SportmonksFixture & { comments?: SportmonksComment[] }).comments;
  return Array.isArray(raw) ? raw : [];
}

export function getFixtureTrends(fixture: SportmonksFixture): SportmonksTrendPoint[] {
  const raw = (fixture as SportmonksFixture & { trends?: SportmonksTrendPoint[] }).trends;
  return Array.isArray(raw) ? raw : [];
}

export function getFixtureTimelineEntries(fixture: SportmonksFixture): SportmonksTimelineEntry[] {
  const raw = (fixture as SportmonksFixture & { timeline?: SportmonksTimelineEntry[] }).timeline;
  return Array.isArray(raw) ? raw : [];
}

export function detectSportmonksFeedSources(fixture: SportmonksFixture): SportmonksFeedSources {
  const trends = getFixtureTrends(fixture);
  const comments = getFixtureComments(fixture);
  const timeline = getFixtureTimelineEntries(fixture);
  const odds = resolveAllFixtureOdds(fixture);
  const premiumOnly = (fixture as SportmonksFixture & { premiumOdds?: unknown[] }).premiumOdds;

  return {
    statistics: (fixture.statistics?.length ?? 0) > 0,
    momentum: trends.length > 0,
    xg: getFixtureXg(fixture).length > 0 || sumXgFromFixture(fixture) > 0,
    commentary: comments.length > 0,
    timeline: timeline.length > 0 || getFixtureEvents(fixture).length > 0,
    advancedOdds:
      odds.length > 0 &&
      ((fixture as SportmonksFixture & { premiumOdds?: unknown[] }).premiumOdds?.length ??
        0) > 0,
    inplayOdds: (fixture as SportmonksFixture & { inplayOdds?: unknown[] }).inplayOdds
      ? ((fixture as SportmonksFixture & { inplayOdds?: unknown[] }).inplayOdds?.length ?? 0) >
        0
      : odds.length > 0,
    premiumOdds: Array.isArray(premiumOnly) && premiumOnly.length > 0,
  };
}

export function parseCommentaryLines(fixture: SportmonksFixture, limit = 12): CommentaryLine[] {
  const comments = getFixtureComments(fixture);
  if (comments.length === 0) return [];

  return [...comments]
    .sort((a, b) => {
      const ma = safeNum(a.minute, 0) * 100 + safeNum(a.order, 0);
      const mb = safeNum(b.minute, 0) * 100 + safeNum(b.order, 0);
      return ma - mb;
    })
    .slice(-limit)
    .map((c) => ({
      minute: safeNum(c.minute, 0),
      text: String(c.comment ?? "").trim(),
      isGoal: Boolean(c.is_goal),
      isImportant: Boolean(c.is_important),
    }))
    .filter((c) => c.text.length > 0);
}

export function parseMomentumFromTrends(fixture: SportmonksFixture): SportmonksMomentumParse {
  const trends = getFixtureTrends(fixture);
  if (trends.length === 0) {
    return { score: 0, direction: "STABLE", series: [], fromProvider: false };
  }

  const series = trends
    .map((t) => ({
      minute: safeNum(t.minute, 0),
      value: safeNum(t.value ?? t.data?.value, NaN),
    }))
    .filter((p) => Number.isFinite(p.value))
    .sort((a, b) => a.minute - b.minute);

  if (series.length === 0) {
    return {
      score: 0,
      direction: "STABLE",
      series: [],
      fromProvider: trends.length > 0,
    };
  }

  const values = series.map((s) => s.value);
  const latest = values[values.length - 1]!;
  const prev = values.length >= 2 ? values[values.length - 2]! : latest;
  const delta = latest - prev;

  let direction: PressureTrend = "STABLE";
  if (delta >= 3) direction = "RISING";
  else if (delta <= -3) direction = "FALLING";

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const score = Math.min(100, Math.round(Math.max(latest, avg)));

  return { score, direction, series, fromProvider: true };
}

export function parseTimelineFromProvider(
  fixture: SportmonksFixture,
  homeId?: number,
  awayId?: number,
  limit = 28
): TimelineEventSummary[] {
  const fromTimeline = getFixtureTimelineEntries(fixture).map((ev) => ({
    minute: safeNum(ev.minute, 0),
    type: eventTypeLabel(ev),
    side: resolveSide(ev.participant_id, homeId, awayId),
    source: "timeline" as const,
  }));

  const fromEvents = getFixtureEvents(fixture).map((ev) => ({
    minute: safeNum(ev.minute, 0),
    type: eventTypeLabel(ev),
    side: resolveSide(ev.participant_id, homeId, awayId),
    source: "events" as const,
  }));

  const merged = [...fromTimeline, ...fromEvents].sort((a, b) => a.minute - b.minute);

  const seen = new Set<string>();
  const out: TimelineEventSummary[] = [];
  for (const e of merged) {
    const key = `${e.minute}|${e.type}|${e.side ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ minute: e.minute, type: e.type, side: e.side });
    if (out.length >= limit) break;
  }
  return out;
}

export function parseXgBySide(
  fixture: SportmonksFixture,
  homeId?: number,
  awayId?: number
): { home: number; away: number; total: number } {
  const entries = getFixtureXg(fixture);
  let home = 0;
  let away = 0;

  for (const e of entries) {
    const v = safeNum(e.data?.value ?? e.value, 0);
    if (v <= 0) continue;
    if (e.participant_id === homeId || e.location === "home") home += v;
    else if (e.participant_id === awayId || e.location === "away") away += v;
  }

  const total =
    home + away > 0 ? Math.round((home + away) * 100) / 100 : sumXgFromFixture(fixture);
  return { home: Math.round(home * 100) / 100, away: Math.round(away * 100) / 100, total };
}

export function parseAdvancedOddsMeta(fixture: SportmonksFixture): SportmonksAdvancedOddsMeta {
  const f = fixture as SportmonksFixture & {
    inplayOdds?: { id?: number; market_id?: number; bookmaker_id?: number }[];
    premiumOdds?: { id?: number; market_id?: number; bookmaker_id?: number }[];
  };
  const inplay = f.inplayOdds ?? [];
  const premium = f.premiumOdds ?? [];
  const all = resolveAllFixtureOdds(fixture);

  const bookmakers = new Set<number>();
  const markets = new Set<number>();
  for (const o of all) {
    if (o.bookmaker_id != null) bookmakers.add(o.bookmaker_id);
    if (o.market_id != null) markets.add(o.market_id);
  }

  return {
    inplayCount: inplay.length,
    premiumCount: premium.length,
    bookmakerCount: bookmakers.size,
    marketCount: markets.size,
  };
}

export function inferPressureTrendFromFeed(
  fixture: SportmonksFixture
): PressureTrend | undefined {
  const m = parseMomentumFromTrends(fixture);
  if (!m.fromProvider || m.series.length < 2) return undefined;
  return m.direction;
}

/** Enrich MatchPremiumContext fields from parsed SportMonks feed. */
export function enrichPremiumFromSportmonksFeed(
  fixture: SportmonksFixture,
  base: MatchPremiumContext,
  homeId?: number,
  awayId?: number
): MatchPremiumContext {
  const sources = detectSportmonksFeedSources(fixture);
  const momentum = parseMomentumFromTrends(fixture);
  const commentary = parseCommentaryLines(fixture);
  const timelineEvents = parseTimelineFromProvider(fixture, homeId, awayId);
  const xgBySide = parseXgBySide(fixture, homeId, awayId);
  const oddsMeta = parseAdvancedOddsMeta(fixture);

  const momentumScore = momentum.fromProvider ? momentum.score : base.momentumScore;
  const timeline =
    timelineEvents.length > 0 ? timelineEvents : base.timelineEvents;

  return {
    ...base,
    timelineEvents: timeline,
    timelineEventsCount: timeline.length,
    momentumScore,
    momentumDirection: momentum.fromProvider ? momentum.direction : base.momentumDirection,
    momentumSeries: momentum.fromProvider ? momentum.series : base.momentumSeries,
    commentary,
    commentaryCount: commentary.length,
    xgHome: xgBySide.home > 0 ? xgBySide.home : base.xgHome,
    xgAway: xgBySide.away > 0 ? xgBySide.away : base.xgAway,
    advancedOddsCount: oddsMeta.inplayCount + oddsMeta.premiumCount,
    bookmakersCount: oddsMeta.bookmakerCount || base.bookmakersCount,
    feedSources: sources,
    xgAvailable: sources.xg || base.xgAvailable,
    oddsAvailable: oddsMeta.inplayCount + oddsMeta.premiumCount > 0 || base.oddsAvailable,
    eventsAvailable: sources.timeline || base.eventsAvailable,
  };
}
