import { getPressureTier, type Match, type MatchStats, type MatchTeamStats, type Odds } from "@/types/domain";
import { applyPressureToMatch } from "@/lib/pressureScore";

export type DbMatchRow = {
  external_id: string;
  fixture_id?: string | null;
  home_team: string;
  away_team: string;
  league?: string | null;
  minute: number;
  status: string;
  pressure_score?: number | null;
  score?: { home?: number; away?: number } | null;
  stats?: Record<string, unknown> | null;
  odds?: Record<string, unknown> | null;
  updated_at?: string;
};

function parseStats(raw: Record<string, unknown> | null | undefined): MatchStats {
  const s = raw ?? {};
  return {
    shots: Number(s.shots ?? 12),
    shotsOnTarget: Number(s.shotsOnTarget ?? 5),
    dangerousAttacks: Number(s.dangerousAttacks ?? 30),
    corners: Number(s.corners ?? 5),
    xG: Number(s.xG ?? 1.2),
    possession: Number(s.possession ?? 50),
  };
}

function parseOdds(raw: Record<string, unknown> | null | undefined): Odds {
  const o = raw ?? {};
  return {
    primary: Number(o.primary ?? 1.85),
    over05: Number(o.over05 ?? 1.15),
    over15: Number(o.over15 ?? 1.7),
    over25: Number(o.over25 ?? 2.2),
    bttsYes: Number(o.bttsYes ?? 1.75),
  };
}

function parseTeamStats(raw: Record<string, unknown> | null | undefined): MatchTeamStats | undefined {
  const t = raw?.teamStats as MatchTeamStats | undefined;
  if (t?.home && t?.away) return t;
  const base = parseStats(raw);
  return {
    home: {
      shots: Math.ceil(base.shots * 0.55),
      shotsOnTarget: Math.ceil(base.shotsOnTarget * 0.55),
      dangerousAttacks: Math.ceil(base.dangerousAttacks * 0.55),
      totalAttacks: Math.ceil(base.dangerousAttacks * 0.7),
      corners: Math.ceil(base.corners * 0.55),
      xG: base.xG ? base.xG * 0.55 : undefined,
      possession: base.possession ?? 50,
    },
    away: {
      shots: Math.floor(base.shots * 0.45),
      shotsOnTarget: Math.floor(base.shotsOnTarget * 0.45),
      dangerousAttacks: Math.floor(base.dangerousAttacks * 0.45),
      totalAttacks: Math.floor(base.dangerousAttacks * 0.6),
      corners: Math.floor(base.corners * 0.45),
      xG: base.xG ? base.xG * 0.45 : undefined,
      possession: 100 - (base.possession ?? 50),
    },
  };
}

export function mapDbRowToMatch(row: DbMatchRow): Match {
  const scoreRaw = row.score ?? { home: 0, away: 0 };
  const base: Match = {
    id: `sm-${row.external_id}`,
    externalId: row.external_id,
    league: row.league ?? "GoalPressure Seed",
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    minute: row.minute,
    status: (row.status as Match["status"]) ?? "LIVE",
    score: { home: Number(scoreRaw.home ?? 0), away: Number(scoreRaw.away ?? 0) },
    stats: parseStats(row.stats as Record<string, unknown>),
    odds: parseOdds(row.odds as Record<string, unknown>),
    teamStats: parseTeamStats(row.stats as Record<string, unknown>),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
    pressure: {
      score: Number(row.pressure_score ?? 50),
      trend: "RISING",
      tier: getPressureTier(Number(row.pressure_score ?? 50)),
    },
  };
  return applyPressureToMatch(base, { previousScore: Number(row.pressure_score ?? 50) });
}
