/** Tipos do Smart Personalized Workspace — camada de leitura/UI, sem engines principais. */

export const BEHAVIOR_EVENTS = [
  "workspace_view",
  "terminal_open",
  "match_view",
  "match_expand",
  "favorite_toggle",
  "watchlist_add",
  "watchlist_remove",
  "league_favorite",
  "team_favorite",
  "gpi_focus",
  "alert_open",
  "telegram_interest",
  "filter_favorites",
] as const;

export type BehaviorEventType = (typeof BEHAVIOR_EVENTS)[number];

export type OperationalStyle = "agressivo" | "seletivo" | "explorador" | "institucional";

export interface BehaviorEventInput {
  eventType: BehaviorEventType;
  fixtureId?: string;
  leagueId?: number;
  teamId?: number;
  payload?: Record<string, unknown>;
}

export interface BehaviorEventRecord extends BehaviorEventInput {
  id: string;
  createdAt: string;
}

export interface OperationalProfile {
  userId: string;
  behavioralScore: number;
  operationalStyle: OperationalStyle;
  liveAffinity: number;
  pressurePreference: number;
  gpiAffinity: number;
  telegramAffinity: number;
  traits: ProfileTraits;
  updatedAt: string;
}

export interface ProfileTraits {
  totalEvents: number;
  matchViews: number;
  watchlistAdds: number;
  favoriteToggles: number;
  terminalSessions: number;
  gpiFocusCount: number;
  avgPressureViewed: number;
  topLeagueIds: number[];
  topTeamIds: number[];
}

export interface RecommendedMatch {
  fixtureId: string;
  label: string;
  pressureScore: number;
  personalizedScore: number;
  reason: string;
  live: boolean;
}

export interface PersonalizedAlert {
  id: string;
  fixtureId: string | null;
  matchLabel: string | null;
  message: string;
  severity: "low" | "medium" | "high";
  compatibilityScore: number;
  reason: string;
  createdAt: string;
}

export interface SmartWorkspacePayload {
  profile: OperationalProfile;
  recommendedMatches: RecommendedMatch[];
  compatibleAlerts: PersonalizedAlert[];
  adaptiveFeedPriority: "pressure" | "favorites" | "balanced";
}

export const DEFAULT_PROFILE_TRAITS: ProfileTraits = {
  totalEvents: 0,
  matchViews: 0,
  watchlistAdds: 0,
  favoriteToggles: 0,
  terminalSessions: 0,
  gpiFocusCount: 0,
  avgPressureViewed: 50,
  topLeagueIds: [],
  topTeamIds: [],
};
