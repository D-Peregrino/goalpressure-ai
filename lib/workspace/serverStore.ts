import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { devAuthEnabled } from "@/lib/auth/devStore";
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

declare global {
  // eslint-disable-next-line no-var
  var __GP_WORKSPACE_DEV__: Map<string, UserWorkspaceData> | undefined;
}

function devMap(): Map<string, UserWorkspaceData> {
  if (!globalThis.__GP_WORKSPACE_DEV__) {
    globalThis.__GP_WORKSPACE_DEV__ = new Map();
  }
  return globalThis.__GP_WORKSPACE_DEV__;
}

function rowToWorkspace(row: {
  favorites?: string[] | null;
  watched?: string[] | null;
  reading_history?: unknown;
  recent_opportunities?: unknown;
  saved_opportunities?: unknown;
  recent_alerts?: unknown;
  activity_log?: unknown;
  onboarding_completed?: boolean | null;
  spotlight_completed?: boolean | null;
  last_route?: string | null;
}): UserWorkspaceData {
  return {
    favorites: row.favorites ?? [],
    watched: row.watched ?? [],
    readingHistory: (row.reading_history as ReadingHistoryEntry[]) ?? [],
    recentOpportunities: (row.recent_opportunities as RecentOpportunity[]) ?? [],
    savedOpportunities: (row.saved_opportunities as SavedOpportunity[]) ?? [],
    recentAlerts: (row.recent_alerts as RecentAlert[]) ?? [],
    activityLog: (row.activity_log as ActivityEntry[]) ?? [],
    onboardingCompleted: Boolean(row.onboarding_completed),
    spotlightCompleted: Boolean(row.spotlight_completed),
    lastRoute: row.last_route ?? null,
  };
}

export async function getWorkspaceForUser(
  userId: string
): Promise<UserWorkspaceData | null> {
  if (devAuthEnabled()) {
    return devMap().get(userId) ?? { ...EMPTY_WORKSPACE };
  }

  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) return null;

  const { data, error } = await admin
    .from("user_workspace")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return { ...EMPTY_WORKSPACE };
  return rowToWorkspace(data);
}

export async function saveWorkspaceForUser(
  userId: string,
  workspace: UserWorkspaceData
): Promise<{ ok: boolean; error?: string }> {
  const payload = {
    user_id: userId,
    favorites: workspace.favorites.slice(0, WORKSPACE_LIMITS.favorites),
    watched: workspace.watched.slice(0, WORKSPACE_LIMITS.watched),
    reading_history: workspace.readingHistory.slice(0, WORKSPACE_LIMITS.readingHistory),
    recent_opportunities: workspace.recentOpportunities.slice(
      0,
      WORKSPACE_LIMITS.recentOpportunities
    ),
    saved_opportunities: workspace.savedOpportunities.slice(
      0,
      WORKSPACE_LIMITS.savedOpportunities
    ),
    recent_alerts: workspace.recentAlerts.slice(0, WORKSPACE_LIMITS.recentAlerts),
    activity_log: workspace.activityLog.slice(0, WORKSPACE_LIMITS.activityLog),
    onboarding_completed: workspace.onboardingCompleted,
    spotlight_completed: workspace.spotlightCompleted,
    last_route: workspace.lastRoute ?? null,
    updated_at: new Date().toISOString(),
  };

  if (devAuthEnabled()) {
    devMap().set(userId, rowToWorkspace(payload));
    return { ok: true };
  }

  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) {
    return { ok: false, error: "workspace_nao_configurado" };
  }

  const { error } = await admin.from("user_workspace").upsert(payload, {
    onConflict: "user_id",
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
