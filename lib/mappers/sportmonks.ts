/**
 * Sportmonks → GoalPressure domain mapper.
 * No API calls, no tokens — transforms raw fixture payloads into `Match`.
 * @see https://docs.sportmonks.com/football/
 */

import {
  applyPressureToMatch,
  calculatePressureScore,
} from "@/lib/pressureScore";
import type {
  Match,
  MatchScore,
  MatchStats,
  MatchStatus,
  Odds,
} from "@/types/domain";

// ─── Raw Sportmonks payload (minimal, tolerant shapes) ───────────────────────

export interface SportmonksTeam {
  id?: number;
  name?: string;
  short_code?: string;
  meta?: {
    location?: "home" | "away";
    winner?: boolean | null;
    position?: number;
  };
}

export interface SportmonksLeague {
  id?: number;
  name?: string;
  country_id?: number;
}

export interface SportmonksState {
  id?: number;
  name?: string;
  state?: string;
  short_name?: string;
}

export interface SportmonksScoreEntry {
  id?: number;
  participant_id?: number;
  type_id?: number;
  score?: {
    goals?: number;
    participant?: string;
  };
  description?: string;
}

export interface SportmonksStatistic {
  id?: number;
  fixture_id?: number;
  type_id?: number;
  participant_id?: number;
  value?: number | string | null;
  type?: {
    id?: number;
    name?: string;
    code?: string;
    developer_name?: string;
  };
  data?: {
    value?: number | string | null;
  };
}

export interface SportmonksOdds {
  id?: number;
  fixture_id?: number;
  market_id?: number;
  bookmaker_id?: number;
  label?: string;
  name?: string;
  value?: string | number;
  market_description?: string;
  probability?: string;
}

export interface SportmonksStats {
  statistics?: SportmonksStatistic[];
}

export interface SportmonksPeriod {
  id?: number;
  fixture_id?: number;
  type_id?: number;
  started?: number;
  ended?: number;
  counts_from?: number;
  ticking?: boolean;
  sort_order?: number;
  description?: string;
  minutes?: number;
  seconds?: number;
  has_timer?: boolean;
}

export interface SportmonksFixture {
  id: number;
  sport_id?: number;
  league_id?: number;
  season_id?: number;
  stage_id?: number;
  group_id?: number | null;
  aggregate_id?: number | null;
  round_id?: number | null;
  state_id?: number;
  venue_id?: number | null;
  name?: string;
  starting_at?: string;
  result_info?: string | null;
  leg?: string;
  details?: string | null;
  length?: number;
  placeholder?: boolean;
  has_odds?: boolean;
  has_premium_odds?: boolean;
  starting_at_timestamp?: number;
  state?: SportmonksState;
  league?: SportmonksLeague;
  participants?: SportmonksTeam[];
  scores?: SportmonksScoreEntry[];
  statistics?: SportmonksStatistic[];
  /** @deprecated Use inplayOdds on livescores/inplay — `odds` causes HTTP 422 */
  odds?: SportmonksOdds[];
  /** Correct include name for inplay livescores endpoint */
  inplayOdds?: SportmonksOdds[];
  periods?: SportmonksPeriod[];
  /** Some responses expose minute at root */
  minute?: number;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_STATS: MatchStats = {
  shots: 0,
  shotsOnTarget: 0,
  dangerousAttacks: 0,
  corners: 0,
};

const DEFAULT_ODDS: Odds = {
  primary: 1,
  over05: 1,
  over15: 1,
};

const DEFAULT_SCORE: MatchScore = {
  home: 0,
  away: 0,
};

/** Sportmonks state_id → domain status (common football API v3 ids) */
const STATE_ID_TO_STATUS: Record<number, MatchStatus> = {
  1: "NOT_STARTED",
  2: "LIVE",
  3: "LIVE",
  4: "FINISHED",
  5: "POSTPONED",
  6: "POSTPONED",
  7: "CANCELLED",
  8: "FINISHED",
  9: "FINISHED",
  10: "POSTPONED",
  11: "HALFTIME",
  12: "CANCELLED",
  13: "NOT_STARTED",
  14: "POSTPONED",
  15: "CANCELLED",
  16: "LIVE",
  17: "LIVE",
  18: "FINISHED",
  19: "FINISHED",
  20: "FINISHED",
  21: "FINISHED",
  22: "LIVE",
  25: "FINISHED",
  26: "FINISHED",
};

const STATE_NAME_TO_STATUS: Record<string, MatchStatus> = {
  NS: "NOT_STARTED",
  "NOT STARTED": "NOT_STARTED",
  LIVE: "LIVE",
  INPLAY: "LIVE",
  "IN PLAY": "LIVE",
  HT: "HALFTIME",
  HALFTIME: "HALFTIME",
  FT: "FINISHED",
  FINISHED: "FINISHED",
  AET: "FINISHED",
  FT_PEN: "FINISHED",
  POSTPONED: "POSTPONED",
  CANCELLED: "CANCELLED",
  ABANDONED: "CANCELLED",
  SUSPENDED: "POSTPONED",
  DELAYED: "POSTPONED",
};

const STAT_NAME_ALIASES: Record<string, keyof MatchStats> = {
  shots: "shots",
  "shots total": "shots",
  "goal attempts": "shots",
  "shots on target": "shotsOnTarget",
  shotsontarget: "shotsOnTarget",
  "on target": "shotsOnTarget",
  "dangerous attacks": "dangerousAttacks",
  dangerousattacks: "dangerousAttacks",
  "attacks dangerous": "dangerousAttacks",
  "dangerous attack": "dangerousAttacks",
  corners: "corners",
  "corner kicks": "corners",
  corner: "corners",
};

// ─── Internal helpers ──────────────────────────────────────────────────────────

function safeString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeStatKey(raw: string | undefined): keyof MatchStats | null {
  if (!raw) return null;
  const key = raw.toLowerCase().trim();
  return STAT_NAME_ALIASES[key] ?? null;
}

function resolveParticipants(fixture: SportmonksFixture): {
  home: SportmonksTeam | undefined;
  away: SportmonksTeam | undefined;
} {
  const participants = fixture.participants ?? [];
  if (participants.length === 0) {
    return { home: undefined, away: undefined };
  }

  let home = participants.find((p) => p.meta?.location === "home");
  let away = participants.find((p) => p.meta?.location === "away");

  if (!home && participants[0]) home = participants[0];
  if (!away && participants[1]) away = participants[1];

  return { home, away };
}

function mapTeams(fixture: SportmonksFixture): {
  homeTeam: string;
  awayTeam: string;
} {
  const { home, away } = resolveParticipants(fixture);

  const homeTeam = safeString(
    home?.name ?? parseTeamFromFixtureName(fixture.name, 0),
    "Home"
  );
  const awayTeam = safeString(
    away?.name ?? parseTeamFromFixtureName(fixture.name, 1),
    "Away"
  );

  return { homeTeam, awayTeam };
}

function parseTeamFromFixtureName(
  name: string | undefined,
  index: 0 | 1
): string | undefined {
  if (!name) return undefined;
  const parts = name.split(/\s+vs\.?\s+/i);
  return parts[index]?.trim();
}

function mapStatus(fixture: SportmonksFixture): MatchStatus {
  const stateId = fixture.state_id ?? fixture.state?.id;
  if (stateId !== undefined && STATE_ID_TO_STATUS[stateId]) {
    return STATE_ID_TO_STATUS[stateId];
  }

  const raw =
    fixture.state?.state ??
    fixture.state?.short_name ??
    fixture.state?.name ??
    "";
  const normalized = raw.toUpperCase().replace(/-/g, "_").trim();
  if (STATE_NAME_TO_STATUS[normalized]) {
    return STATE_NAME_TO_STATUS[normalized];
  }

  return "UNKNOWN";
}

function isCurrentScoreEntry(entry: SportmonksScoreEntry): boolean {
  const desc = (entry.description ?? "").toUpperCase();
  return (
    desc === "CURRENT" ||
    desc === "2ND_HALF" ||
    desc === "1ST_HALF" ||
    desc === "" ||
    entry.type_id === 1525
  );
}

function mapScore(fixture: SportmonksFixture): MatchScore {
  const scores = fixture.scores ?? [];
  const { home, away } = resolveParticipants(fixture);
  const homeId = home?.id;
  const awayId = away?.id;

  const currentEntries = scores.filter(isCurrentScoreEntry);
  const entries = currentEntries.length > 0 ? currentEntries : scores;

  let homeGoals = 0;
  let awayGoals = 0;
  let matched = false;

  for (const entry of entries) {
    const goals = safeNumber(entry.score?.goals, -1);
    if (goals < 0) continue;

    if (homeId !== undefined && entry.participant_id === homeId) {
      homeGoals = goals;
      matched = true;
    } else if (awayId !== undefined && entry.participant_id === awayId) {
      awayGoals = goals;
      matched = true;
    }
  }

  if (!matched && entries.length >= 2) {
    homeGoals = safeNumber(entries[0]?.score?.goals, 0);
    awayGoals = safeNumber(entries[1]?.score?.goals, 0);
    matched = true;
  }

  if (!matched) {
    return { ...DEFAULT_SCORE };
  }

  return { home: homeGoals, away: awayGoals };
}

function extractStatValue(stat: SportmonksStatistic): number {
  const raw = stat.data?.value ?? stat.value;
  return Math.max(0, Math.floor(safeNumber(raw, 0)));
}

function mapStats(fixture: SportmonksFixture): MatchStats {
  const statistics = fixture.statistics ?? [];
  if (statistics.length === 0) {
    return { ...DEFAULT_STATS };
  }

  const totals: MatchStats = {
    shots: 0,
    shotsOnTarget: 0,
    dangerousAttacks: 0,
    corners: 0,
  };
  const { home, away } = resolveParticipants(fixture);
  const homeId = home?.id;
  const awayId = away?.id;

  for (const stat of statistics) {
    const field =
      normalizeStatKey(stat.type?.developer_name) ??
      normalizeStatKey(stat.type?.code) ??
      normalizeStatKey(stat.type?.name);
    if (!field) continue;

    const value = extractStatValue(stat);
    const pid = stat.participant_id;

    if (pid === homeId || pid === awayId) {
      totals[field] += value;
    } else if (pid === undefined) {
      totals[field] = Math.max(totals[field], value);
    }
  }

  return {
    shots: totals.shots,
    shotsOnTarget: totals.shotsOnTarget,
    dangerousAttacks: totals.dangerousAttacks,
    corners: totals.corners,
  };
}

function findOddValue(
  odds: SportmonksOdds[],
  matcher: (entry: SportmonksOdds) => boolean
): number | null {
  for (const entry of odds) {
    if (!matcher(entry)) continue;
    const value = safeNumber(entry.value, 0);
    if (value >= 1) return value;
  }
  return null;
}

function resolveFixtureOdds(fixture: SportmonksFixture): SportmonksOdds[] {
  return fixture.inplayOdds ?? fixture.odds ?? [];
}

function mapOdds(fixture: SportmonksFixture): Odds {
  const odds = resolveFixtureOdds(fixture);
  if (odds.length === 0) {
    return { ...DEFAULT_ODDS };
  }

  const over05 =
    findOddValue(odds, (o) => {
      const label = `${o.label ?? ""} ${o.name ?? ""} ${o.market_description ?? ""}`.toLowerCase();
      return (
        label.includes("over 0.5") ||
        label.includes("over 0,5") ||
        label.includes("o0.5") ||
        (label.includes("over") && label.includes("0.5"))
      );
    }) ?? null;

  const over15 =
    findOddValue(odds, (o) => {
      const label = `${o.label ?? ""} ${o.name ?? ""} ${o.market_description ?? ""}`.toLowerCase();
      return (
        label.includes("over 1.5") ||
        label.includes("over 1,5") ||
        label.includes("o1.5") ||
        (label.includes("over") && label.includes("1.5"))
      );
    }) ?? null;

  const primary =
    over05 ??
    findOddValue(odds, (o) => safeNumber(o.value, 0) >= 1) ??
    DEFAULT_ODDS.primary;

  return {
    primary,
    over05: over05 ?? primary,
    over15: over15 ?? primary,
  };
}

function mapMinute(fixture: SportmonksFixture): number {
  if (fixture.minute !== undefined) {
    return Math.min(120, Math.max(0, Math.floor(fixture.minute)));
  }

  const ticking = fixture.periods?.find((p) => p.ticking);
  if (ticking?.minutes !== undefined) {
    return Math.min(120, Math.max(0, Math.floor(ticking.minutes)));
  }

  const lastPeriod = fixture.periods?.[fixture.periods.length - 1];
  if (lastPeriod?.minutes !== undefined) {
    return Math.min(120, Math.max(0, Math.floor(lastPeriod.minutes)));
  }

  return 0;
}

function mapLeague(fixture: SportmonksFixture): string {
  return safeString(fixture.league?.name, "Unknown League");
}

function buildInternalId(fixtureId: number): string {
  return `sm-${fixtureId}`;
}

// ─── Public API ────────────────────────────────────────────────────────────────

/** Maps fixture to domain `Match` without pressure (ingest step). */
export function buildMatchFromSportmonksFixture(
  fixture: SportmonksFixture
): Match {
  const now = Date.now();
  const { homeTeam, awayTeam } = mapTeams(fixture);

  return {
    id: buildInternalId(fixture.id),
    externalId: String(fixture.id),
    league: mapLeague(fixture),
    homeTeam,
    awayTeam,
    minute: mapMinute(fixture),
    status: mapStatus(fixture),
    score: mapScore(fixture),
    stats: mapStats(fixture),
    odds: mapOdds(fixture),
    pressure: { score: 0 },
    updatedAt: now,
  };
}

/**
 * Maps a raw Sportmonks fixture (single resource or included relation) to `Match`.
 * Missing fields use safe fallbacks — suitable for partial API includes.
 */
export function mapSportmonksFixtureToMatch(fixture: SportmonksFixture): Match {
  return applyPressureToMatch(buildMatchFromSportmonksFixture(fixture));
}

/**
 * Batch mapper for live fixtures — applies `calculatePressureScore` per match.
 */
export function mapSportmonksFixturesToMatches(
  fixtures: SportmonksFixture[]
): Match[] {
  return fixtures
    .filter((fixture): fixture is SportmonksFixture => typeof fixture?.id === "number")
    .map((fixture) => {
      const base = buildMatchFromSportmonksFixture(fixture);
      return {
        ...base,
        pressure: calculatePressureScore(base),
      };
    });
}
