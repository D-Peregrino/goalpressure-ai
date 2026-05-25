export interface RecentOpportunity {
  fixtureId: string;
  label: string;
  narrative: string;
  ts: number;
}

export interface ReadingHistoryEntry {
  fixtureId: string;
  label: string;
  narrative?: string;
  ts: number;
}

export interface SavedOpportunity extends RecentOpportunity {
  pinned?: boolean;
}

export interface RecentAlert {
  id: string;
  fixtureId: string;
  label: string;
  message: string;
  ts: number;
}

export interface ActivityEntry {
  id: string;
  type: string;
  label: string;
  fixtureId?: string;
  ts: number;
}

export interface UserWorkspaceData {
  favorites: string[];
  watched: string[];
  readingHistory: ReadingHistoryEntry[];
  recentOpportunities: RecentOpportunity[];
  savedOpportunities: SavedOpportunity[];
  recentAlerts: RecentAlert[];
  activityLog: ActivityEntry[];
  onboardingCompleted: boolean;
  spotlightCompleted: boolean;
  lastRoute?: string | null;
}

export const EMPTY_WORKSPACE: UserWorkspaceData = {
  favorites: [],
  watched: [],
  readingHistory: [],
  recentOpportunities: [],
  savedOpportunities: [],
  recentAlerts: [],
  activityLog: [],
  onboardingCompleted: false,
  spotlightCompleted: false,
  lastRoute: null,
};

export const WORKSPACE_LIMITS = {
  favorites: 80,
  watched: 48,
  readingHistory: 40,
  recentOpportunities: 12,
  savedOpportunities: 24,
  recentAlerts: 20,
  activityLog: 30,
} as const;
