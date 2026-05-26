/**
 * Normalização segura de partidas live — nunca inventa placar ou minuto.
 */

import {
  fixtureIdFromMatch,
  normalizeFixtureId,
  toDisplayStatus,
  type DisplayMatchStatus,
} from "@/lib/ui/matchFormatting";
import {
  extractLogosFromRaw,
  resolveTeamLogoFromMatch,
} from "@/lib/teams/teamLogoResolver";
import type { Match, MatchScore, MatchStatus } from "@/types/domain";

export interface NormalizedLiveMatchCore {
  fixtureId: string;
  matchId: string;
  league: string;
  round?: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  scoreKnown: boolean;
  minute: number | null;
  minuteLabel: string;
  status: MatchStatus | undefined;
  displayStatus: DisplayMatchStatus;
  homeLogo: string | null;
  awayLogo: string | null;
  debug?: {
    scoreMissing?: boolean;
    fixtureMissing?: boolean;
  };
}

function isFiniteScore(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

function pairFromHomeAway(
  home: unknown,
  away: unknown
): { home: number; away: number } | null {
  if (!isFiniteScore(home) || !isFiniteScore(away)) return null;
  return { home, away };
}

/** Extrai placar de objetos crus (API / fixture Sportmonks). */
export function extractScoreFromRaw(raw: unknown): {
  home: number | null;
  away: number | null;
  known: boolean;
} {
  if (!raw || typeof raw !== "object") {
    return { home: null, away: null, known: false };
  }

  const o = raw as Record<string, unknown>;

  const direct = pairFromHomeAway(o.homeScore, o.awayScore);
  if (direct) return { ...direct, known: true };

  const snake = pairFromHomeAway(o.home_score, o.away_score);
  if (snake) return { ...snake, known: true };

  const scores = o.scores;
  if (scores && typeof scores === "object") {
    const s = scores as Record<string, unknown>;
    const nested = pairFromHomeAway(s.home, s.away);
    if (nested) return { ...nested, known: true };
  }

  const result = o.result;
  if (result && typeof result === "object") {
    const r = result as Record<string, unknown>;
    const nested = pairFromHomeAway(r.home, r.away);
    if (nested) return { ...nested, known: true };
  }

  const scoreObj = o.score;
  if (scoreObj && typeof scoreObj === "object") {
    const sc = scoreObj as Record<string, unknown>;
    const current = sc.current;
    if (current && typeof current === "object") {
      const c = current as Record<string, unknown>;
      const nested = pairFromHomeAway(c.home, c.away);
      if (nested) return { ...nested, known: true };
    }
    const nested = pairFromHomeAway(sc.home, sc.away);
    if (nested) return { ...nested, known: true };
  }

  const participants = o.participants;
  if (Array.isArray(participants)) {
    let homeGoals: number | null = null;
    let awayGoals: number | null = null;
    for (const p of participants) {
      if (!p || typeof p !== "object") continue;
      const part = p as Record<string, unknown>;
      const meta = part.meta as Record<string, unknown> | undefined;
      const loc = meta?.location;
      const goals =
        (part.goals as number | undefined) ??
        (part.score as number | undefined) ??
        ((part.score as Record<string, unknown> | undefined)?.goals as number | undefined);
      if (!isFiniteScore(goals)) continue;
      if (loc === "home") homeGoals = goals;
      if (loc === "away") awayGoals = goals;
    }
    if (homeGoals != null && awayGoals != null) {
      return { home: homeGoals, away: awayGoals, known: true };
    }
  }

  const entries = o.scores;
  if (Array.isArray(entries) && entries.length > 0) {
    const participants = Array.isArray(o.participants) ? o.participants : [];
    const homeP = participants.find((p) => {
      if (!p || typeof p !== "object") return false;
      const meta = (p as Record<string, unknown>).meta as { location?: string } | undefined;
      return meta?.location === "home";
    }) as Record<string, unknown> | undefined;
    const awayP = participants.find((p) => {
      if (!p || typeof p !== "object") return false;
      const meta = (p as Record<string, unknown>).meta as { location?: string } | undefined;
      return meta?.location === "away";
    }) as Record<string, unknown> | undefined;
    const homeId = homeP?.id as number | undefined;
    const awayId = awayP?.id as number | undefined;

    let homeGoals: number | null = null;
    let awayGoals: number | null = null;

    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      const score = e.score as Record<string, unknown> | undefined;
      const goals = score?.goals;
      if (!isFiniteScore(goals)) continue;
      const pid = e.participant_id as number | undefined;
      if (homeId !== undefined && pid === homeId) homeGoals = goals;
      else if (awayId !== undefined && pid === awayId) awayGoals = goals;
    }

    if (homeGoals != null && awayGoals != null) {
      return { home: homeGoals, away: awayGoals, known: true };
    }
  }

  return { home: null, away: null, known: false };
}

function scoreFromMatch(match: Match): {
  home: number | null;
  away: number | null;
  known: boolean;
} {
  if (match.score === undefined) {
    return { home: null, away: null, known: false };
  }
  const { home, away } = match.score;
  if (!isFiniteScore(home) || !isFiniteScore(away)) {
    return { home: null, away: null, known: false };
  }
  return { home, away, known: true };
}

export function formatMinuteLabel(
  minute: number | null,
  status?: MatchStatus
): string {
  const display = toDisplayStatus(status);
  if (display === "PRE") return "PRE";
  if (display === "HT") return "HT";
  if (display === "FT") return "FT";
  if (display === "POST") return "POST";
  if (display === "LIVE") {
    if (minute == null || minute <= 0) return "AO VIVO";
    if (minute > 90) return `${minute}'+`;
    return `${minute}'`;
  }
  if (minute == null || minute <= 0) return "—";
  if (minute > 90) return `${minute}'+`;
  return `${minute}'`;
}

function resolveMinute(match: Match, opsMinute?: number): number | null {
  if (match.minute > 0) return match.minute;
  if (opsMinute != null && opsMinute > 0) return opsMinute;
  if (match.status === "LIVE" || match.status === "HALFTIME") {
    return match.minute > 0 ? match.minute : null;
  }
  return match.minute > 0 ? match.minute : null;
}

function isMatch(raw: unknown): raw is Match {
  return (
    !!raw &&
    typeof raw === "object" &&
    "id" in raw &&
    "homeTeam" in raw &&
    "awayTeam" in raw
  );
}

/** Normaliza partida a partir do domínio Match ou payload cru da API. */
export function normalizeLiveMatch(
  raw: Match | Record<string, unknown>,
  options?: { opsMinute?: number; warnContext?: string }
): NormalizedLiveMatchCore {
  const isDev = process.env.NODE_ENV === "development";

  if (isMatch(raw)) {
    const match = raw;
    const fixtureId = fixtureIdFromMatch(match);
    const fromMatch = scoreFromMatch(match);
    const fromRaw = extractScoreFromRaw(match);
    const score =
      fromMatch.known
        ? fromMatch
        : fromRaw.known
          ? fromRaw
          : { home: null, away: null, known: false };

    if (!score.known && isDev) {
      console.warn("[match-center] score missing", {
        context: options?.warnContext,
        fixtureId,
        matchId: match.id,
        status: match.status,
      });
    }

    const minute = resolveMinute(match, options?.opsMinute);
    const displayStatus = toDisplayStatus(match.status);

    return {
      fixtureId,
      matchId: match.id,
      league: match.league,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore: score.known ? score.home : null,
      awayScore: score.known ? score.away : null,
      scoreKnown: score.known,
      minute,
      minuteLabel: formatMinuteLabel(minute, match.status),
      status: match.status,
      displayStatus,
      homeLogo: resolveTeamLogoFromMatch(match, "home"),
      awayLogo: resolveTeamLogoFromMatch(match, "away"),
      debug: isDev
        ? {
            scoreMissing: !score.known,
            fixtureMissing: !fixtureId,
          }
        : undefined,
    };
  }

  const o = raw as Record<string, unknown>;
  const score = extractScoreFromRaw(o);
  const logos = extractLogosFromRaw(o);

  const homeTeam =
    (o.homeTeam as string) ??
    (o.home_team as string) ??
    "Home";
  const awayTeam =
    (o.awayTeam as string) ??
    (o.away_team as string) ??
    "Away";

  const fixtureId =
    (o.fixtureId as string) ??
    (o.externalId as string) ??
    (o.id != null ? normalizeFixtureId(String(o.id)) : "");

  if (!score.known && isDev) {
    console.warn("[match-center] score missing", { raw: o, fixtureId });
  }
  if (!fixtureId && isDev) {
    console.warn("[match-center] fixture missing", raw);
  }

  const status = o.status as MatchStatus | undefined;
  const minuteRaw = o.minute as number | undefined;
  const minute =
    typeof minuteRaw === "number" && minuteRaw > 0
      ? minuteRaw
      : options?.opsMinute && options.opsMinute > 0
        ? options.opsMinute
        : null;

  return {
    fixtureId,
    matchId: (o.matchId as string) ?? (fixtureId ? `sm-${fixtureId}` : ""),
    league: (o.league as string) ?? "—",
    homeTeam: String(homeTeam),
    awayTeam: String(awayTeam),
    homeScore: score.known ? score.home : null,
    awayScore: score.known ? score.away : null,
    scoreKnown: score.known,
    minute,
    minuteLabel: formatMinuteLabel(minute, status),
    status,
    displayStatus: toDisplayStatus(status),
    homeLogo: logos.homeLogo,
    awayLogo: logos.awayLogo,
    debug: isDev
      ? { scoreMissing: !score.known, fixtureMissing: !fixtureId }
      : undefined,
  };
}

export function formatScoreDisplay(
  homeScore: number | null,
  awayScore: number | null,
  scoreKnown: boolean
): { home: string; away: string } {
  if (!scoreKnown || homeScore == null || awayScore == null) {
    return { home: "—", away: "—" };
  }
  return { home: String(homeScore), away: String(awayScore) };
}
