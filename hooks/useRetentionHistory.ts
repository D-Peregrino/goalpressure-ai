"use client";

import { useCallback, useEffect, useState } from "react";

const RECENT_KEY = "gp_recent_opportunities";
const WATCHED_KEY = "gp_watched_fixtures";
const MAX_RECENT = 12;
const MAX_WATCHED = 24;

export interface RecentOpportunity {
  fixtureId: string;
  label: string;
  narrative: string;
  ts: number;
}

export function useRetentionHistory() {
  const [recent, setRecent] = useState<RecentOpportunity[]>([]);
  const [watched, setWatched] = useState<string[]>([]);

  useEffect(() => {
    try {
      const r = localStorage.getItem(RECENT_KEY);
      if (r) setRecent(JSON.parse(r) as RecentOpportunity[]);
      const w = localStorage.getItem(WATCHED_KEY);
      if (w) setWatched(JSON.parse(w) as string[]);
    } catch {
      /* ignore */
    }
  }, []);

  const recordOpportunity = useCallback(
    (entry: Omit<RecentOpportunity, "ts"> & { ts?: number }) => {
      const item: RecentOpportunity = {
        ...entry,
        ts: entry.ts ?? Date.now(),
      };
      setRecent((prev) => {
        const next = [
          item,
          ...prev.filter((p) => p.fixtureId !== item.fixtureId),
        ].slice(0, MAX_RECENT);
        try {
          localStorage.setItem(RECENT_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    []
  );

  const markWatched = useCallback((fixtureId: string) => {
    setWatched((prev) => {
      const next = [
        fixtureId,
        ...prev.filter((id) => id !== fixtureId),
      ].slice(0, MAX_WATCHED);
      try {
        localStorage.setItem(WATCHED_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { recent, watched, recordOpportunity, markWatched };
}
