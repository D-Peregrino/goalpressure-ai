"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchWithAuth } from "@/lib/auth/fetchWithAuth";
import { pushActivity } from "@/lib/workspace/activity";
import {
  loadLocalWorkspace,
  mergeWorkspaces,
  saveLocalWorkspace,
} from "@/lib/workspace/localStore";
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

type SyncState = "idle" | "loading" | "synced" | "local" | "error";

interface UserWorkspaceContextValue {
  ready: boolean;
  syncState: SyncState;
  favorites: Set<string>;
  watched: string[];
  recent: RecentOpportunity[];
  saved: SavedOpportunity[];
  recentAlerts: RecentAlert[];
  activityLog: ActivityEntry[];
  readingHistory: ReadingHistoryEntry[];
  onboardingCompleted: boolean;
  spotlightCompleted: boolean;
  onboardingOpen: boolean;
  setOnboardingOpen: (open: boolean) => void;
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;
  spotlightOpen: boolean;
  spotlightStep: number;
  setSpotlightStep: (step: number) => void;
  toggleFavorite: (fixtureId: string, label?: string) => void;
  markWatched: (fixtureId: string, label?: string) => void;
  recordOpportunity: (entry: Omit<RecentOpportunity, "ts"> & { ts?: number }) => void;
  saveOpportunity: (entry: Omit<SavedOpportunity, "ts"> & { ts?: number }) => void;
  recordAlert: (entry: Omit<RecentAlert, "id" | "ts"> & { id?: string; ts?: number }) => void;
  recordActivity: (entry: Omit<ActivityEntry, "id" | "ts"> & { ts?: number }) => void;
  recordReading: (entry: Omit<ReadingHistoryEntry, "ts"> & { ts?: number }) => void;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  completeSpotlight: () => void;
  skipSpotlight: () => void;
  persistRoute: (path: string) => void;
  flushSync: () => Promise<void>;
}

const UserWorkspaceContext = createContext<UserWorkspaceContextValue | null>(null);

function toSet(ids: string[]): Set<string> {
  return new Set(ids);
}

export function UserWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<UserWorkspaceData>(EMPTY_WORKSPACE);
  const [ready, setReady] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [spotlightStep, setSpotlightStep] = useState(0);
  const dataRef = useRef(data);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  dataRef.current = data;

  const scheduleRemoteSync = useCallback(() => {
    if (!user) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      void fetchWithAuth("/api/user/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataRef.current),
      })
        .then((r) => {
          if (r.ok) setSyncState("synced");
          else setSyncState("error");
        })
        .catch(() => setSyncState("error"));
    }, 600);
  }, [user]);

  const applyWorkspace = useCallback(
    (next: UserWorkspaceData, options?: { sync?: boolean }) => {
      setData(next);
      saveLocalWorkspace(next);
      if (options?.sync !== false) scheduleRemoteSync();
    },
    [scheduleRemoteSync]
  );

  const hydrate = useCallback(async () => {
    const local = loadLocalWorkspace();
    if (!user) {
      setData(local);
      setSyncState("local");
      setReady(true);
      return;
    }

    setSyncState("loading");
    try {
      const res = await fetchWithAuth("/api/user/workspace");
      if (res.ok) {
        const json = (await res.json()) as { workspace?: UserWorkspaceData | null };
        const remote = json.workspace ?? EMPTY_WORKSPACE;
        const merged = mergeWorkspaces(local, remote);
        setData(merged);
        saveLocalWorkspace(merged);
        setSyncState("synced");
        const isAdminUser = user.role === "admin";
        if (!isAdminUser && !merged.onboardingCompleted) {
          setOnboardingOpen(true);
        } else if (!isAdminUser && !merged.spotlightCompleted) {
          setSpotlightOpen(true);
        }
        if (JSON.stringify(merged) !== JSON.stringify(remote)) {
          scheduleRemoteSync();
        }
      } else {
        setData(local);
        setSyncState("local");
      }
    } catch {
      setData(local);
      setSyncState("local");
    } finally {
      setReady(true);
    }
  }, [user, scheduleRemoteSync]);

  useEffect(() => {
    if (authLoading) return;
    void hydrate();
  }, [authLoading, user?.id, hydrate]);

  const toggleFavorite = useCallback(
    (fixtureId: string, label?: string) => {
      const ids = [...dataRef.current.favorites];
      const idx = ids.indexOf(fixtureId);
      const added = idx < 0;
      if (idx >= 0) ids.splice(idx, 1);
      else ids.unshift(fixtureId);
      const activityLog = pushActivity(dataRef.current.activityLog, {
        type: added ? "favorite_add" : "favorite_remove",
        label: added ? `Favorito: ${label ?? fixtureId}` : `Removido dos favoritos`,
        fixtureId,
      });
      applyWorkspace({
        ...dataRef.current,
        favorites: ids.slice(0, WORKSPACE_LIMITS.favorites),
        activityLog,
      });
    },
    [applyWorkspace]
  );

  const markWatched = useCallback(
    (fixtureId: string, label?: string) => {
      const ids = [
        fixtureId,
        ...dataRef.current.watched.filter((id) => id !== fixtureId),
      ].slice(0, WORKSPACE_LIMITS.watched);
      const activityLog = pushActivity(dataRef.current.activityLog, {
        type: "watched",
        label: label ?? `Acompanhando ${fixtureId}`,
        fixtureId,
      });
      applyWorkspace({ ...dataRef.current, watched: ids, activityLog });
    },
    [applyWorkspace]
  );

  const recordOpportunity = useCallback(
    (entry: Omit<RecentOpportunity, "ts"> & { ts?: number }) => {
      const item: RecentOpportunity = { ...entry, ts: entry.ts ?? Date.now() };
      const list = [
        item,
        ...dataRef.current.recentOpportunities.filter((p) => p.fixtureId !== item.fixtureId),
      ].slice(0, WORKSPACE_LIMITS.recentOpportunities);
      applyWorkspace({ ...dataRef.current, recentOpportunities: list });
    },
    [applyWorkspace]
  );

  const saveOpportunity = useCallback(
    (entry: Omit<SavedOpportunity, "ts"> & { ts?: number }) => {
      const item: SavedOpportunity = { ...entry, ts: entry.ts ?? Date.now(), pinned: true };
      const savedOpportunities = [
        item,
        ...dataRef.current.savedOpportunities.filter((p) => p.fixtureId !== item.fixtureId),
      ].slice(0, WORKSPACE_LIMITS.savedOpportunities);
      const activityLog = pushActivity(dataRef.current.activityLog, {
        type: "save_opportunity",
        label: `Oportunidade salva: ${item.label}`,
        fixtureId: item.fixtureId,
      });
      applyWorkspace({ ...dataRef.current, savedOpportunities, activityLog });
    },
    [applyWorkspace]
  );

  const recordAlert = useCallback(
    (entry: Omit<RecentAlert, "id" | "ts"> & { id?: string; ts?: number }) => {
      const item: RecentAlert = {
        ...entry,
        id: entry.id ?? `alert_${Date.now()}`,
        ts: entry.ts ?? Date.now(),
      };
      const recentAlerts = [
        item,
        ...dataRef.current.recentAlerts.filter((a) => a.id !== item.id),
      ].slice(0, WORKSPACE_LIMITS.recentAlerts);
      applyWorkspace({ ...dataRef.current, recentAlerts });
    },
    [applyWorkspace]
  );

  const recordActivity = useCallback(
    (entry: Omit<ActivityEntry, "id" | "ts"> & { ts?: number }) => {
      applyWorkspace({
        ...dataRef.current,
        activityLog: pushActivity(dataRef.current.activityLog, entry),
      });
    },
    [applyWorkspace]
  );

  const recordReading = useCallback(
    (entry: Omit<ReadingHistoryEntry, "ts"> & { ts?: number }) => {
      const item: ReadingHistoryEntry = { ...entry, ts: entry.ts ?? Date.now() };
      const readingHistory = [
        item,
        ...dataRef.current.readingHistory.filter((p) => p.fixtureId !== item.fixtureId),
      ].slice(0, WORKSPACE_LIMITS.readingHistory);
      const watched = [
        item.fixtureId,
        ...dataRef.current.watched.filter((id) => id !== item.fixtureId),
      ].slice(0, WORKSPACE_LIMITS.watched);
      const activityLog = pushActivity(dataRef.current.activityLog, {
        type: "reading",
        label: `Leitura: ${item.label}`,
        fixtureId: item.fixtureId,
      });
      applyWorkspace({ ...dataRef.current, readingHistory, watched, activityLog });
    },
    [applyWorkspace]
  );

  const completeOnboarding = useCallback(() => {
    applyWorkspace({ ...dataRef.current, onboardingCompleted: true });
    setOnboardingOpen(false);
    setOnboardingStep(0);
    if (!dataRef.current.spotlightCompleted) {
      setSpotlightOpen(true);
      setSpotlightStep(0);
    }
  }, [applyWorkspace]);

  const skipOnboarding = completeOnboarding;

  const completeSpotlight = useCallback(() => {
    applyWorkspace({ ...dataRef.current, spotlightCompleted: true });
    setSpotlightOpen(false);
    setSpotlightStep(0);
  }, [applyWorkspace]);

  const skipSpotlight = completeSpotlight;

  const persistRoute = useCallback(
    (path: string) => {
      applyWorkspace({ ...dataRef.current, lastRoute: path }, { sync: true });
    },
    [applyWorkspace]
  );

  const flushSync = useCallback(async () => {
    if (!user) return;
    await fetchWithAuth("/api/user/workspace", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataRef.current),
    });
  }, [user]);

  const value = useMemo<UserWorkspaceContextValue>(
    () => ({
      ready,
      syncState,
      favorites: toSet(data.favorites),
      watched: data.watched,
      recent: data.recentOpportunities,
      saved: data.savedOpportunities,
      recentAlerts: data.recentAlerts,
      activityLog: data.activityLog,
      readingHistory: data.readingHistory,
      onboardingCompleted: data.onboardingCompleted,
      spotlightCompleted: data.spotlightCompleted,
      onboardingOpen,
      setOnboardingOpen,
      onboardingStep,
      setOnboardingStep,
      spotlightOpen,
      spotlightStep,
      setSpotlightStep,
      toggleFavorite,
      markWatched,
      recordOpportunity,
      saveOpportunity,
      recordAlert,
      recordActivity,
      recordReading,
      completeOnboarding,
      skipOnboarding,
      completeSpotlight,
      skipSpotlight,
      persistRoute,
      flushSync,
    }),
    [
      ready,
      syncState,
      data,
      onboardingOpen,
      onboardingStep,
      spotlightOpen,
      spotlightStep,
      toggleFavorite,
      markWatched,
      recordOpportunity,
      saveOpportunity,
      recordAlert,
      recordActivity,
      recordReading,
      completeOnboarding,
      skipOnboarding,
      completeSpotlight,
      skipSpotlight,
      persistRoute,
      flushSync,
    ]
  );

  return (
    <UserWorkspaceContext.Provider value={value}>{children}</UserWorkspaceContext.Provider>
  );
}

export function useUserWorkspace(): UserWorkspaceContextValue {
  const ctx = useContext(UserWorkspaceContext);
  if (!ctx) {
    return {
      ready: true,
      syncState: "local",
      favorites: new Set(),
      watched: [],
      recent: [],
      saved: [],
      recentAlerts: [],
      activityLog: [],
      readingHistory: [],
      onboardingCompleted: false,
      spotlightCompleted: false,
      onboardingOpen: false,
      setOnboardingOpen: () => {},
      onboardingStep: 0,
      setOnboardingStep: () => {},
      spotlightOpen: false,
      spotlightStep: 0,
      setSpotlightStep: () => {},
      toggleFavorite: () => {},
      markWatched: () => {},
      recordOpportunity: () => {},
      saveOpportunity: () => {},
      recordAlert: () => {},
      recordActivity: () => {},
      recordReading: () => {},
      completeOnboarding: () => {},
      skipOnboarding: () => {},
      completeSpotlight: () => {},
      skipSpotlight: () => {},
      persistRoute: () => {},
      flushSync: async () => {},
    };
  }
  return ctx;
}
