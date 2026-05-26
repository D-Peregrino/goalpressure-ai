"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchWithAuth } from "@/lib/auth/fetchWithAuth";
import type { ReadingHistoryEntry } from "@/lib/workspace/types";
import {
  EMPTY_OPERATIONAL_WORKSPACE,
  type FavoriteLeague,
  type FavoriteTeam,
  type OperationalWorkspacePayload,
  type WatchlistPriority,
  type WorkspacePreferences,
} from "@/lib/workspace/operationalTypes";

interface LegacyWorkspaceSlice {
  favorites: string[];
  watched: string[];
  readingHistory: ReadingHistoryEntry[];
}

interface WorkspaceApiResponse {
  ok: boolean;
  operational: OperationalWorkspacePayload;
  legacy: LegacyWorkspaceSlice | null;
  error?: string;
}

export function useOperationalWorkspace() {
  const { user, loading: authLoading } = useAuth();
  const [operational, setOperational] = useState<OperationalWorkspacePayload>(
    EMPTY_OPERATIONAL_WORKSPACE
  );
  const [legacy, setLegacy] = useState<LegacyWorkspaceSlice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setOperational(EMPTY_OPERATIONAL_WORKSPACE);
      setLegacy(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/workspace");
      const body = (await res.json()) as WorkspaceApiResponse;
      if (!res.ok || !body.ok) {
        setError(body.error ?? "Falha ao carregar workspace");
        return;
      }
      setOperational(body.operational);
      setLegacy(body.legacy);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro de rede");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  const addWatchlist = useCallback(
    async (fixtureId: string, matchLabel?: string, priority?: WatchlistPriority) => {
      const res = await fetchWithAuth("/api/workspace/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", fixtureId, matchLabel, priority }),
      });
      if (res.ok) await refresh();
      return res.ok;
    },
    [refresh]
  );

  const removeWatchlist = useCallback(
    async (fixtureId: string) => {
      const res = await fetchWithAuth("/api/workspace/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", fixtureId }),
      });
      if (res.ok) await refresh();
      return res.ok;
    },
    [refresh]
  );

  const addTeam = useCallback(
    async (team: Omit<FavoriteTeam, "id" | "createdAt">) => {
      const res = await fetchWithAuth("/api/workspace/favorite-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          teamId: team.teamId,
          teamName: team.teamName,
          logoPath: team.logoPath,
          leagueName: team.leagueName,
        }),
      });
      if (res.ok) await refresh();
      return res.ok;
    },
    [refresh]
  );

  const removeTeam = useCallback(
    async (teamId: number) => {
      const res = await fetchWithAuth("/api/workspace/favorite-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", teamId }),
      });
      if (res.ok) await refresh();
      return res.ok;
    },
    [refresh]
  );

  const addLeague = useCallback(
    async (league: Omit<FavoriteLeague, "id" | "createdAt">) => {
      const res = await fetchWithAuth("/api/workspace/favorite-leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          leagueId: league.leagueId,
          leagueName: league.leagueName,
          country: league.country,
        }),
      });
      if (res.ok) await refresh();
      return res.ok;
    },
    [refresh]
  );

  const removeLeague = useCallback(
    async (leagueId: number) => {
      const res = await fetchWithAuth("/api/workspace/favorite-leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", leagueId }),
      });
      if (res.ok) await refresh();
      return res.ok;
    },
    [refresh]
  );

  const updatePreferences = useCallback(
    async (prefs: Partial<WorkspacePreferences>) => {
      const res = await fetchWithAuth("/api/workspace/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (res.ok) await refresh();
      return res.ok;
    },
    [refresh]
  );

  const watchlistIds = new Set(operational.watchlist.map((w) => w.fixtureId));

  return {
    user,
    loading: loading || authLoading,
    error,
    operational,
    legacy,
    watchlistIds,
    refresh,
    addWatchlist,
    removeWatchlist,
    addTeam,
    removeTeam,
    addLeague,
    removeLeague,
    updatePreferences,
  };
}
