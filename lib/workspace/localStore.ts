import {
  EMPTY_WORKSPACE,
  WORKSPACE_LIMITS,
  type ReadingHistoryEntry,
  type RecentOpportunity,
  type UserWorkspaceData,
} from "@/lib/workspace/types";

const KEYS = {
  favorites: "gp-match-favorites",
  watched: "gp_watched_fixtures",
  recent: "gp_recent_opportunities",
  history: "gp_reading_history",
  onboarding: "gp_onboarding_v1",
} as const;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

export function loadLocalWorkspace(): UserWorkspaceData {
  if (typeof window === "undefined") return EMPTY_WORKSPACE;
  return {
    favorites: readJson<string[]>(KEYS.favorites, []),
    watched: readJson<string[]>(KEYS.watched, []),
    readingHistory: readJson<ReadingHistoryEntry[]>(KEYS.history, []),
    recentOpportunities: readJson<RecentOpportunity[]>(KEYS.recent, []),
    onboardingCompleted: localStorage.getItem(KEYS.onboarding) === "1",
    lastRoute: null,
  };
}

export function saveLocalWorkspace(data: UserWorkspaceData): void {
  if (typeof window === "undefined") return;
  writeJson(KEYS.favorites, data.favorites.slice(0, WORKSPACE_LIMITS.favorites));
  writeJson(KEYS.watched, data.watched.slice(0, WORKSPACE_LIMITS.watched));
  writeJson(KEYS.history, data.readingHistory.slice(0, WORKSPACE_LIMITS.readingHistory));
  writeJson(KEYS.recent, data.recentOpportunities.slice(0, WORKSPACE_LIMITS.recentOpportunities));
  if (data.onboardingCompleted) {
    localStorage.setItem(KEYS.onboarding, "1");
  }
}

export function mergeWorkspaces(
  local: UserWorkspaceData,
  remote: UserWorkspaceData
): UserWorkspaceData {
  const uniq = (arr: string[]) => [...new Set(arr)];
  const mergeRecent = [...remote.recentOpportunities, ...local.recentOpportunities]
    .sort((a, b) => b.ts - a.ts)
    .filter(
      (item, idx, all) => all.findIndex((x) => x.fixtureId === item.fixtureId) === idx
    )
    .slice(0, WORKSPACE_LIMITS.recentOpportunities);

  const mergeHistory = [...remote.readingHistory, ...local.readingHistory]
    .sort((a, b) => b.ts - a.ts)
    .filter(
      (item, idx, all) => all.findIndex((x) => x.fixtureId === item.fixtureId) === idx
    )
    .slice(0, WORKSPACE_LIMITS.readingHistory);

  return {
    favorites: uniq([...remote.favorites, ...local.favorites]).slice(
      0,
      WORKSPACE_LIMITS.favorites
    ),
    watched: uniq([...remote.watched, ...local.watched]).slice(0, WORKSPACE_LIMITS.watched),
    readingHistory: mergeHistory,
    recentOpportunities: mergeRecent,
    onboardingCompleted: remote.onboardingCompleted || local.onboardingCompleted,
    lastRoute: remote.lastRoute ?? local.lastRoute,
  };
}
