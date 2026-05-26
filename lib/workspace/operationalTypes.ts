export type WatchlistPriority = 0 | 1 | 2;

export interface WatchlistItem {
  id: string;
  fixtureId: string;
  matchLabel: string | null;
  note: string | null;
  priority: WatchlistPriority;
  createdAt: string;
  updatedAt: string;
}

export interface FavoriteTeam {
  id: string;
  teamId: number;
  teamName: string;
  logoPath: string | null;
  leagueName: string | null;
  createdAt: string;
}

export interface FavoriteLeague {
  id: string;
  leagueId: number;
  leagueName: string;
  country: string | null;
  createdAt: string;
}

export interface AlertHistoryItem {
  id: string;
  fixtureId: string | null;
  matchLabel: string | null;
  alertType: string;
  message: string;
  severity: "low" | "medium" | "high";
  readAt: string | null;
  createdAt: string;
}

export interface WorkspacePreferences {
  defaultView: string;
  compactMode: boolean;
  telegramDigest: boolean;
  showDailySummary: boolean;
  pinnedSections: string[];
  updatedAt: string;
}

export const DEFAULT_WORKSPACE_PREFERENCES: WorkspacePreferences = {
  defaultView: "overview",
  compactMode: false,
  telegramDigest: true,
  showDailySummary: true,
  pinnedSections: [],
  updatedAt: new Date().toISOString(),
};

export interface OperationalWorkspacePayload {
  watchlist: WatchlistItem[];
  favoriteTeams: FavoriteTeam[];
  favoriteLeagues: FavoriteLeague[];
  alertHistory: AlertHistoryItem[];
  preferences: WorkspacePreferences;
}

export const EMPTY_OPERATIONAL_WORKSPACE: OperationalWorkspacePayload = {
  watchlist: [],
  favoriteTeams: [],
  favoriteLeagues: [],
  alertHistory: [],
  preferences: DEFAULT_WORKSPACE_PREFERENCES,
};

export const OPERATIONAL_LIMITS = {
  watchlist: 64,
  favoriteTeams: 32,
  favoriteLeagues: 24,
  alertHistory: 100,
} as const;

/** Presets para adicionar sem busca API */
export const LEAGUE_PRESETS = [
  { leagueId: 8, leagueName: "Premier League", country: "Inglaterra" },
  { leagueId: 564, leagueName: "La Liga", country: "Espanha" },
  { leagueId: 82, leagueName: "Bundesliga", country: "Alemanha" },
  { leagueId: 384, leagueName: "Serie A", country: "Itália" },
  { leagueId: 648, leagueName: "Brasileirão Série A", country: "Brasil" },
  { leagueId: 2, leagueName: "Champions League", country: "UEFA" },
] as const;

export const TEAM_PRESETS = [
  { teamId: 8, teamName: "Liverpool", logoPath: "/images/soccer/teams/8/8.png", leagueName: "Premier League" },
  { teamId: 9, teamName: "Manchester City", logoPath: "/images/soccer/teams/9/9.png", leagueName: "Premier League" },
  { teamId: 83, teamName: "Barcelona", logoPath: "/images/soccer/teams/83/83.png", leagueName: "La Liga" },
  { teamId: 19, teamName: "Arsenal", logoPath: "/images/soccer/teams/19/19.png", leagueName: "Premier League" },
  { teamId: 2930, teamName: "Inter", logoPath: "/images/soccer/teams/2930/2930.png", leagueName: "Serie A" },
  { teamId: 598, teamName: "Flamengo", logoPath: "/images/soccer/teams/598/598.png", leagueName: "Brasileirão" },
] as const;
