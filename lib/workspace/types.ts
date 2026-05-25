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

export interface UserWorkspaceData {
  favorites: string[];
  watched: string[];
  readingHistory: ReadingHistoryEntry[];
  recentOpportunities: RecentOpportunity[];
  onboardingCompleted: boolean;
  lastRoute?: string | null;
}

export const EMPTY_WORKSPACE: UserWorkspaceData = {
  favorites: [],
  watched: [],
  readingHistory: [],
  recentOpportunities: [],
  onboardingCompleted: false,
  lastRoute: null,
};

export const WORKSPACE_LIMITS = {
  favorites: 80,
  watched: 48,
  readingHistory: 40,
  recentOpportunities: 12,
} as const;
