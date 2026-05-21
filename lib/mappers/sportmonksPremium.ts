/**
 * SportMonks premium payload parsing — xG, events, trends, odds, lineups.
 */

import type { SportmonksFixture } from "@/lib/mappers/sportmonks";
import type { MatchStats, MatchTeamStats, Odds, PressureTrend } from "@/types/domain";

export interface SportmonksEvent {
  id?: number;
  fixture_id?: number;
  participant_id?: number;
  type_id?: number;
  minute?: number;
  extra_minute?: number | null;
  type?: { id?: number; name?: string; code?: string; developer_name?: string };
}

export interface SportmonksXgEntry {
  id?: number;
  fixture_id?: number;
  participant_id?: number;
  location?: "home" | "away";
  type_id?: number;
  data?: { value?: number | string };
  value?: number | string;
}

export interface PremiumFeedDetection {
  statistics: boolean;
  events: boolean;
  lineups: boolean;
  formations: boolean;
  trends: boolean;
  timeline: boolean;
  xg: boolean;
  inplayOdds: boolean;
  premiumOdds: boolean;
  venue: boolean;
  hasTeamLevelStats: boolean;
}

export interface PremiumFixtureAudit {
  detection: PremiumFeedDetection;
  statsSample: Partial<MatchStats>;
  xgTotal: number;
  eventCount: number;
  oddsCount: number;
  lineupCount: number;
  trendCount: number;
}

/** SportMonks v3 common statistic type_id → domain field */
export const STAT_TYPE_ID_TO_FIELD: Record<number, keyof MatchStats> = {
  34: "corners",
  42: "shots",
  86: "shotsOnTarget",
  45: "possession",
  47: "dangerousAttacks",
  49: "totalAttacks",
  52: "dangerousAttacks",
  56: "shotsOnTarget",
  57: "shots",
  58: "corners",
  60: "possession",
  78: "dangerousAttacks",
  80: "totalAttacks",
  82: "shots",
  83: "shotsOnTarget",
  84: "corners",
  5304: "xG",
  5305: "xG",
};

function safeNum(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const p = Number.parseFloat(v);
    if (Number.isFinite(p)) return p;
  }
  return fallback;
}

export function getFixtureEvents(fixture: SportmonksFixture): SportmonksEvent[] {
  const raw = fixture as SportmonksFixture & { events?: SportmonksEvent[] };
  return Array.isArray(raw.events) ? raw.events : [];
}

export function getFixtureXg(fixture: SportmonksFixture): SportmonksXgEntry[] {
  const f = fixture as SportmonksFixture & {
    xGFixture?: SportmonksXgEntry[];
    xgfixture?: SportmonksXgEntry[];
  };
  if (Array.isArray(f.xGFixture)) return f.xGFixture;
  if (Array.isArray(f.xgfixture)) return f.xgfixture;
  return [];
}

export function sumXgFromFixture(fixture: SportmonksFixture): number {
  const entries = getFixtureXg(fixture);
  if (entries.length === 0) return 0;
  let sum = 0;
  for (const e of entries) {
    const v = safeNum(e.data?.value ?? e.value, 0);
    if (v > 0) sum += v;
  }
  return Math.round(sum * 100) / 100;
}

export function mergeXgIntoStats(stats: MatchStats, xgTotal: number): MatchStats {
  if (xgTotal <= 0) return stats;
  const current = stats.xG ?? 0;
  if (current >= xgTotal * 0.5) return stats;
  return { ...stats, xG: Math.max(current, xgTotal) };
}

export function inferStatsFromEvents(
  fixture: SportmonksFixture,
  homeId?: number,
  awayId?: number
): { home: Partial<MatchStats>; away: Partial<MatchStats> } | null {
  const events = getFixtureEvents(fixture);
  if (events.length === 0) return null;

  const home: Partial<MatchStats> = {};
  const away: Partial<MatchStats> = {};

  for (const ev of events) {
    const code = (
      ev.type?.developer_name ??
      ev.type?.code ??
      ev.type?.name ??
      ""
    )
      .toUpperCase()
      .replace(/\s+/g, "_");

    const side =
      ev.participant_id === homeId
        ? home
        : ev.participant_id === awayId
          ? away
          : null;
    if (!side) continue;

    if (code.includes("CORNER")) {
      side.corners = (side.corners ?? 0) + 1;
    }
    if (code.includes("YELLOW") || code.includes("RED")) {
      /* cards tracked in events only */
    }
  }

  const hasData =
    (home.corners ?? 0) > 0 ||
    (away.corners ?? 0) > 0;
  return hasData ? { home, away } : null;
}

export function resolveAllFixtureOdds(
  fixture: SportmonksFixture
): import("@/lib/mappers/sportmonks").SportmonksOdds[] {
  const f = fixture as SportmonksFixture & {
    inplayOdds?: import("@/lib/mappers/sportmonks").SportmonksOdds[];
    premiumOdds?: import("@/lib/mappers/sportmonks").SportmonksOdds[];
    odds?: import("@/lib/mappers/sportmonks").SportmonksOdds[];
  };
  const merged = [
    ...(f.inplayOdds ?? []),
    ...(f.premiumOdds ?? []),
    ...(f.odds ?? []),
  ];
  const seen = new Set<number>();
  return merged.filter((o) => {
    const id = o.id ?? Math.random();
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function detectPremiumFeed(fixture: SportmonksFixture): PremiumFeedDetection {
  const f = fixture as SportmonksFixture & {
    lineups?: unknown[];
    formations?: unknown[];
    trends?: unknown[];
    timeline?: unknown[];
    premiumOdds?: unknown[];
    venue?: unknown;
  };

  const stats = fixture.statistics ?? [];
  const hasParticipantStats = stats.some((s) => s.participant_id != null);

  return {
    statistics: stats.length > 0,
    events: getFixtureEvents(fixture).length > 0,
    lineups: Array.isArray(f.lineups) && f.lineups.length > 0,
    formations: Array.isArray(f.formations) && f.formations.length > 0,
    trends: Array.isArray(f.trends) && f.trends.length > 0,
    timeline: Array.isArray(f.timeline) && f.timeline.length > 0,
    xg: getFixtureXg(fixture).length > 0,
    inplayOdds: (f.inplayOdds?.length ?? 0) > 0,
    premiumOdds: (f.premiumOdds?.length ?? 0) > 0,
    venue: f.venue != null,
    hasTeamLevelStats: hasParticipantStats,
  };
}

export function auditPremiumFixture(fixture: SportmonksFixture): PremiumFixtureAudit {
  const detection = detectPremiumFeed(fixture);
  return {
    detection,
    statsSample: {},
    xgTotal: sumXgFromFixture(fixture),
    eventCount: getFixtureEvents(fixture).length,
    oddsCount: resolveAllFixtureOdds(fixture).length,
    lineupCount: (fixture as SportmonksFixture & { lineups?: unknown[] }).lineups
      ?.length ?? 0,
    trendCount:
      (fixture as SportmonksFixture & { trends?: unknown[] }).trends?.length ?? 0,
  };
}

export function inferPressureTrendFromTrends(
  fixture: SportmonksFixture
): PressureTrend | undefined {
  const trends = (fixture as SportmonksFixture & { trends?: { type?: string }[] })
    .trends;
  if (!Array.isArray(trends) || trends.length < 2) return undefined;
  return "RISING";
}
