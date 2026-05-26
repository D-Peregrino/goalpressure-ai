export type CopaMatchStatus = "scheduled" | "live" | "finished" | "unknown";

export interface CopaTeam {
  id: string;
  name: string;
  shortCode?: string;
  logoUrl?: string | null;
  group?: string;
}

export interface CopaMatch {
  fixtureId: string;
  matchId: string;
  kickoffAt: string;
  kickoffLabel: string;
  home: CopaTeam;
  away: CopaTeam;
  homeScore: number | null;
  awayScore: number | null;
  minute: number | null;
  status: CopaMatchStatus;
  stage?: string;
  group?: string;
  venue?: string | null;
  isLive: boolean;
}

export interface CopaGroupRow {
  group: string;
  teams: CopaTeam[];
}

export interface CopaStandingRow {
  group: string;
  team: CopaTeam;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export interface CopaCalendarDay {
  date: string;
  label: string;
  matches: CopaMatch[];
}

export interface CopaStatsLeader {
  label: string;
  value: string;
  team?: string;
}

export interface CopaDataset {
  generatedAt: string;
  source: "sportmonks" | "demo" | "mixed";
  leagueId: number;
  overview: {
    totalMatches: number;
    liveNow: number;
    todayCount: number;
    teamsCount: number;
    nextKickoff: string | null;
    headline: string;
  };
  today: CopaMatch[];
  calendar: CopaCalendarDay[];
  groups: CopaGroupRow[];
  standings: CopaStandingRow[];
  teams: CopaTeam[];
  stats: {
    leaders: CopaStatsLeader[];
    totals: { goals: number; matchesPlayed: number; avgGoals: number };
  };
  liveFixtureIds: string[];
}

export type CopaSection =
  | "overview"
  | "today"
  | "calendar"
  | "groups"
  | "standings"
  | "teams"
  | "stats"
  | "favorites"
  | "alerts"
  | "gpi"
  | "replay";
