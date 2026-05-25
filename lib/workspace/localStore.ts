import {
  EMPTY_WORKSPACE,
  WORKSPACE_LIMITS,
  type ActivityEntry,
  type ReadingHistoryEntry,
  type RecentAlert,
  type RecentOpportunity,
  type SavedOpportunity,
  type UserWorkspaceData,
} from "@/lib/workspace/types";

const KEYS = {
  favorites: "gp-match-favorites",
  watched: "gp_watched_fixtures",
  recent: "gp_recent_opportunities",
  saved: "gp_saved_opportunities",
  alerts: "gp_recent_alerts",
  history: "gp_reading_history",
  activity: "gp_activity_log",
  onboarding: "gp_onboarding_v1",
  spotlight: "gp_spotlight_v1",
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
    savedOpportunities: readJson<SavedOpportunity[]>(KEYS.saved, []),
    recentAlerts: readJson<RecentAlert[]>(KEYS.alerts, []),
    activityLog: readJson<ActivityEntry[]>(KEYS.activity, []),
    onboardingCompleted: localStorage.getItem(KEYS.onboarding) === "1",
    spotlightCompleted: localStorage.getItem(KEYS.spotlight) === "1",
    lastRoute: null,
  };
}

export function saveLocalWorkspace(data: UserWorkspaceData): void {
  if (typeof window === "undefined") return;
  writeJson(KEYS.favorites, data.favorites.slice(0, WORKSPACE_LIMITS.favorites));
  writeJson(KEYS.watched, data.watched.slice(0, WORKSPACE_LIMITS.watched));
  writeJson(KEYS.history, data.readingHistory.slice(0, WORKSPACE_LIMITS.readingHistory));
  writeJson(KEYS.recent, data.recentOpportunities.slice(0, WORKSPACE_LIMITS.recentOpportunities));
  writeJson(KEYS.saved, data.savedOpportunities.slice(0, WORKSPACE_LIMITS.savedOpportunities));
  writeJson(KEYS.alerts, data.recentAlerts.slice(0, WORKSPACE_LIMITS.recentAlerts));
  writeJson(KEYS.activity, data.activityLog.slice(0, WORKSPACE_LIMITS.activityLog));
  if (data.onboardingCompleted) localStorage.setItem(KEYS.onboarding, "1");
  if (data.spotlightCompleted) localStorage.setItem(KEYS.spotlight, "1");
}

function mergeJsonList<T extends { fixtureId?: string; ts: number }>(
  a: T[],
  b: T[],
  limit: number,
  key: (x: T) => string
): T[] {
  return [...a, ...b]
    .sort((x, y) => y.ts - x.ts)
    .filter((item, idx, all) => all.findIndex((x) => key(x) === key(item)) === idx)
    .slice(0, limit);
}

export function mergeWorkspaces(
  local: UserWorkspaceData,
  remote: UserWorkspaceData
): UserWorkspaceData {
  const uniq = (arr: string[]) => [...new Set(arr)];
  return {
    favorites: uniq([...remote.favorites, ...local.favorites]).slice(
      0,
      WORKSPACE_LIMITS.favorites
    ),
    watched: uniq([...remote.watched, ...local.watched]).slice(0, WORKSPACE_LIMITS.watched),
    readingHistory: mergeJsonList(
      remote.readingHistory,
      local.readingHistory,
      WORKSPACE_LIMITS.readingHistory,
      (x) => x.fixtureId
    ),
    recentOpportunities: mergeJsonList(
      remote.recentOpportunities,
      local.recentOpportunities,
      WORKSPACE_LIMITS.recentOpportunities,
      (x) => x.fixtureId
    ),
    savedOpportunities: mergeJsonList(
      remote.savedOpportunities,
      local.savedOpportunities,
      WORKSPACE_LIMITS.savedOpportunities,
      (x) => x.fixtureId
    ),
    recentAlerts: mergeJsonList(
      remote.recentAlerts,
      local.recentAlerts,
      WORKSPACE_LIMITS.recentAlerts,
      (x) => x.id
    ),
    activityLog: mergeJsonList(
      remote.activityLog,
      local.activityLog,
      WORKSPACE_LIMITS.activityLog,
      (x) => x.id
    ),
    onboardingCompleted: remote.onboardingCompleted || local.onboardingCompleted,
    spotlightCompleted: remote.spotlightCompleted || local.spotlightCompleted,
    lastRoute: remote.lastRoute ?? local.lastRoute,
  };
}
