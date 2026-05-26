import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { devAuthEnabled } from "@/lib/auth/devStore";
import {
  DEFAULT_WORKSPACE_PREFERENCES,
  EMPTY_OPERATIONAL_WORKSPACE,
  OPERATIONAL_LIMITS,
  type AlertHistoryItem,
  type FavoriteLeague,
  type FavoriteTeam,
  type OperationalWorkspacePayload,
  type WatchlistItem,
  type WatchlistPriority,
  type WorkspacePreferences,
} from "@/lib/workspace/operationalTypes";

declare global {
  // eslint-disable-next-line no-var
  var __GP_OPERATIONAL_DEV__: Map<string, OperationalWorkspacePayload> | undefined;
}

function devStore(): Map<string, OperationalWorkspacePayload> {
  if (!globalThis.__GP_OPERATIONAL_DEV__) {
    globalThis.__GP_OPERATIONAL_DEV__ = new Map();
  }
  return globalThis.__GP_OPERATIONAL_DEV__;
}

function devForUser(userId: string): OperationalWorkspacePayload {
  const map = devStore();
  if (!map.has(userId)) {
    map.set(userId, structuredClone(EMPTY_OPERATIONAL_WORKSPACE));
  }
  return map.get(userId)!;
}

function rowWatchlist(r: Record<string, unknown>): WatchlistItem {
  return {
    id: String(r.id),
    fixtureId: String(r.fixture_id),
    matchLabel: (r.match_label as string) ?? null,
    note: (r.note as string) ?? null,
    priority: Number(r.priority) as WatchlistPriority,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function rowTeam(r: Record<string, unknown>): FavoriteTeam {
  return {
    id: String(r.id),
    teamId: Number(r.team_id),
    teamName: String(r.team_name),
    logoPath: (r.logo_path as string) ?? null,
    leagueName: (r.league_name as string) ?? null,
    createdAt: String(r.created_at),
  };
}

function rowLeague(r: Record<string, unknown>): FavoriteLeague {
  return {
    id: String(r.id),
    leagueId: Number(r.league_id),
    leagueName: String(r.league_name),
    country: (r.country as string) ?? null,
    createdAt: String(r.created_at),
  };
}

function rowAlert(r: Record<string, unknown>): AlertHistoryItem {
  return {
    id: String(r.id),
    fixtureId: (r.fixture_id as string) ?? null,
    matchLabel: (r.match_label as string) ?? null,
    alertType: String(r.alert_type),
    message: String(r.message),
    severity: (r.severity as AlertHistoryItem["severity"]) ?? "medium",
    readAt: (r.read_at as string) ?? null,
    createdAt: String(r.created_at),
  };
}

function rowPrefs(r: Record<string, unknown>): WorkspacePreferences {
  return {
    defaultView: String(r.default_view ?? "overview"),
    compactMode: Boolean(r.compact_mode),
    telegramDigest: Boolean(r.telegram_digest),
    showDailySummary: Boolean(r.show_daily_summary),
    pinnedSections: Array.isArray(r.pinned_sections)
      ? (r.pinned_sections as string[])
      : [],
    updatedAt: String(r.updated_at ?? new Date().toISOString()),
  };
}

export async function getOperationalWorkspace(
  userId: string
): Promise<OperationalWorkspacePayload> {
  if (devAuthEnabled()) {
    return devForUser(userId);
  }

  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) {
    return { ...EMPTY_OPERATIONAL_WORKSPACE };
  }

  const [watchRes, teamsRes, leaguesRes, alertsRes, prefsRes] = await Promise.all([
    admin
      .from("user_watchlists")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(OPERATIONAL_LIMITS.watchlist),
    admin
      .from("user_favorite_teams")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(OPERATIONAL_LIMITS.favoriteTeams),
    admin
      .from("user_favorite_leagues")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(OPERATIONAL_LIMITS.favoriteLeagues),
    admin
      .from("user_alert_history")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(OPERATIONAL_LIMITS.alertHistory),
    admin
      .from("user_workspace_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  return {
    watchlist: (watchRes.data ?? []).map((r) => rowWatchlist(r as Record<string, unknown>)),
    favoriteTeams: (teamsRes.data ?? []).map((r) => rowTeam(r as Record<string, unknown>)),
    favoriteLeagues: (leaguesRes.data ?? []).map((r) => rowLeague(r as Record<string, unknown>)),
    alertHistory: (alertsRes.data ?? []).map((r) => rowAlert(r as Record<string, unknown>)),
    preferences: prefsRes.data
      ? rowPrefs(prefsRes.data as Record<string, unknown>)
      : { ...DEFAULT_WORKSPACE_PREFERENCES },
  };
}

export async function addWatchlistItem(
  userId: string,
  input: {
    fixtureId: string;
    matchLabel?: string;
    note?: string;
    priority?: WatchlistPriority;
  }
): Promise<{ ok: boolean; item?: WatchlistItem; error?: string }> {
  const payload = {
    user_id: userId,
    fixture_id: input.fixtureId,
    match_label: input.matchLabel ?? null,
    note: input.note ?? null,
    priority: input.priority ?? 0,
  };

  if (devAuthEnabled()) {
    const store = devForUser(userId);
    const existing = store.watchlist.find((w) => w.fixtureId === input.fixtureId);
    if (existing) return { ok: true, item: existing };
    if (store.watchlist.length >= OPERATIONAL_LIMITS.watchlist) {
      return { ok: false, error: "limite_watchlist" };
    }
    const item: WatchlistItem = {
      id: crypto.randomUUID(),
      fixtureId: input.fixtureId,
      matchLabel: input.matchLabel ?? null,
      note: input.note ?? null,
      priority: input.priority ?? 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.watchlist.unshift(item);
    return { ok: true, item };
  }

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: "workspace_nao_configurado" };

  const { data, error } = await admin
    .from("user_watchlists")
    .upsert(payload, { onConflict: "user_id,fixture_id" })
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, item: rowWatchlist(data as Record<string, unknown>) };
}

export async function removeWatchlistItem(
  userId: string,
  fixtureId: string
): Promise<{ ok: boolean; error?: string }> {
  if (devAuthEnabled()) {
    const store = devForUser(userId);
    store.watchlist = store.watchlist.filter((w) => w.fixtureId !== fixtureId);
    return { ok: true };
  }

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: "workspace_nao_configurado" };

  const { error } = await admin
    .from("user_watchlists")
    .delete()
    .eq("user_id", userId)
    .eq("fixture_id", fixtureId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function addFavoriteTeam(
  userId: string,
  input: { teamId: number; teamName: string; logoPath?: string; leagueName?: string }
): Promise<{ ok: boolean; item?: FavoriteTeam; error?: string }> {
  const payload = {
    user_id: userId,
    team_id: input.teamId,
    team_name: input.teamName,
    logo_path: input.logoPath ?? null,
    league_name: input.leagueName ?? null,
  };

  if (devAuthEnabled()) {
    const store = devForUser(userId);
    if (store.favoriteTeams.some((t) => t.teamId === input.teamId)) {
      return { ok: true, item: store.favoriteTeams.find((t) => t.teamId === input.teamId) };
    }
    if (store.favoriteTeams.length >= OPERATIONAL_LIMITS.favoriteTeams) {
      return { ok: false, error: "limite_times" };
    }
    const item: FavoriteTeam = {
      id: crypto.randomUUID(),
      teamId: input.teamId,
      teamName: input.teamName,
      logoPath: input.logoPath ?? null,
      leagueName: input.leagueName ?? null,
      createdAt: new Date().toISOString(),
    };
    store.favoriteTeams.unshift(item);
    return { ok: true, item };
  }

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: "workspace_nao_configurado" };

  const { data, error } = await admin
    .from("user_favorite_teams")
    .upsert(payload, { onConflict: "user_id,team_id" })
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, item: rowTeam(data as Record<string, unknown>) };
}

export async function removeFavoriteTeam(
  userId: string,
  teamId: number
): Promise<{ ok: boolean; error?: string }> {
  if (devAuthEnabled()) {
    devForUser(userId).favoriteTeams = devForUser(userId).favoriteTeams.filter(
      (t) => t.teamId !== teamId
    );
    return { ok: true };
  }

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: "workspace_nao_configurado" };

  const { error } = await admin
    .from("user_favorite_teams")
    .delete()
    .eq("user_id", userId)
    .eq("team_id", teamId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function addFavoriteLeague(
  userId: string,
  input: { leagueId: number; leagueName: string; country?: string }
): Promise<{ ok: boolean; item?: FavoriteLeague; error?: string }> {
  const payload = {
    user_id: userId,
    league_id: input.leagueId,
    league_name: input.leagueName,
    country: input.country ?? null,
  };

  if (devAuthEnabled()) {
    const store = devForUser(userId);
    if (store.favoriteLeagues.some((l) => l.leagueId === input.leagueId)) {
      return { ok: true, item: store.favoriteLeagues.find((l) => l.leagueId === input.leagueId) };
    }
    if (store.favoriteLeagues.length >= OPERATIONAL_LIMITS.favoriteLeagues) {
      return { ok: false, error: "limite_ligas" };
    }
    const item: FavoriteLeague = {
      id: crypto.randomUUID(),
      leagueId: input.leagueId,
      leagueName: input.leagueName,
      country: input.country ?? null,
      createdAt: new Date().toISOString(),
    };
    store.favoriteLeagues.unshift(item);
    return { ok: true, item };
  }

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: "workspace_nao_configurado" };

  const { data, error } = await admin
    .from("user_favorite_leagues")
    .upsert(payload, { onConflict: "user_id,league_id" })
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, item: rowLeague(data as Record<string, unknown>) };
}

export async function removeFavoriteLeague(
  userId: string,
  leagueId: number
): Promise<{ ok: boolean; error?: string }> {
  if (devAuthEnabled()) {
    devForUser(userId).favoriteLeagues = devForUser(userId).favoriteLeagues.filter(
      (l) => l.leagueId !== leagueId
    );
    return { ok: true };
  }

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: "workspace_nao_configurado" };

  const { error } = await admin
    .from("user_favorite_leagues")
    .delete()
    .eq("user_id", userId)
    .eq("league_id", leagueId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function appendAlertHistory(
  userId: string,
  input: {
    fixtureId?: string;
    matchLabel?: string;
    alertType?: string;
    message: string;
    severity?: AlertHistoryItem["severity"];
  }
): Promise<{ ok: boolean; error?: string }> {
  const payload = {
    user_id: userId,
    fixture_id: input.fixtureId ?? null,
    match_label: input.matchLabel ?? null,
    alert_type: input.alertType ?? "context",
    message: input.message,
    severity: input.severity ?? "medium",
  };

  if (devAuthEnabled()) {
    const store = devForUser(userId);
    store.alertHistory.unshift({
      id: crypto.randomUUID(),
      fixtureId: input.fixtureId ?? null,
      matchLabel: input.matchLabel ?? null,
      alertType: input.alertType ?? "context",
      message: input.message,
      severity: input.severity ?? "medium",
      readAt: null,
      createdAt: new Date().toISOString(),
    });
    store.alertHistory = store.alertHistory.slice(0, OPERATIONAL_LIMITS.alertHistory);
    return { ok: true };
  }

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: "workspace_nao_configurado" };

  const { error } = await admin.from("user_alert_history").insert(payload);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function saveWorkspacePreferences(
  userId: string,
  prefs: Partial<WorkspacePreferences>
): Promise<{ ok: boolean; preferences?: WorkspacePreferences; error?: string }> {
  const current = (await getOperationalWorkspace(userId)).preferences;
  const next: WorkspacePreferences = {
    defaultView: prefs.defaultView ?? current.defaultView,
    compactMode: prefs.compactMode ?? current.compactMode,
    telegramDigest: prefs.telegramDigest ?? current.telegramDigest,
    showDailySummary: prefs.showDailySummary ?? current.showDailySummary,
    pinnedSections: prefs.pinnedSections ?? current.pinnedSections,
    updatedAt: new Date().toISOString(),
  };

  if (devAuthEnabled()) {
    devForUser(userId).preferences = next;
    return { ok: true, preferences: next };
  }

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: "workspace_nao_configurado" };

  const { data, error } = await admin
    .from("user_workspace_preferences")
    .upsert(
      {
        user_id: userId,
        default_view: next.defaultView,
        compact_mode: next.compactMode,
        telegram_digest: next.telegramDigest,
        show_daily_summary: next.showDailySummary,
        pinned_sections: next.pinnedSections,
        updated_at: next.updatedAt,
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, preferences: rowPrefs(data as Record<string, unknown>) };
}

/** Sincroniza alertas do blob user_workspace quando a tabela ainda está vazia. */
export async function syncAlertsFromBlob(
  userId: string,
  alerts: { id: string; fixtureId: string; label: string; message: string; ts: number }[]
): Promise<void> {
  if (!alerts.length) return;

  const existing = await getOperationalWorkspace(userId);
  if (existing.alertHistory.length > 0) return;

  for (const a of alerts.slice(0, 12)) {
    await appendAlertHistory(userId, {
      fixtureId: a.fixtureId,
      matchLabel: a.label,
      alertType: "workspace",
      message: a.message,
      severity: "medium",
    });
  }
}
