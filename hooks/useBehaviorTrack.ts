"use client";

import { useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchWithAuth } from "@/lib/auth/fetchWithAuth";
import type { BehaviorEventType } from "@/lib/personalization/types";

const DEDUPE_MS = 800;

export function useBehaviorTrack() {
  const { user } = useAuth();
  const lastKey = useRef<string>("");
  const lastAt = useRef(0);

  const track = useCallback(
    (
      eventType: BehaviorEventType,
      meta?: {
        fixtureId?: string;
        leagueId?: number;
        teamId?: number;
        payload?: Record<string, unknown>;
      }
    ) => {
      if (!user) return;

      const key = `${eventType}|${meta?.fixtureId ?? ""}|${meta?.leagueId ?? ""}`;
      const now = Date.now();
      if (key === lastKey.current && now - lastAt.current < DEDUPE_MS) return;
      lastKey.current = key;
      lastAt.current = now;

      void fetchWithAuth("/api/workspace/behavior", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          fixtureId: meta?.fixtureId,
          leagueId: meta?.leagueId,
          teamId: meta?.teamId,
          payload: meta?.payload,
        }),
      }).catch(() => {
        /* fire-and-forget */
      });
    },
    [user]
  );

  return { track, enabled: Boolean(user) };
}
