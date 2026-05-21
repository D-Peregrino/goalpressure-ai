"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mockGames } from "@/data/mockGames";
import { applyPressureToMatch } from "@/lib/pressureScore";
import { evaluateAllGames } from "@/lib/signalEngine";
import type { LiveMatchesApiResponse } from "@/types/api";
import type { Match, Signal } from "@/types/domain";

const API_PATH = "/api/live-matches";
const DEFAULT_POLL_INTERVAL_MS = 20_000;
const DEFAULT_STALE_AFTER_MS = 45_000;
const MOCK_TICK_INTERVAL_MS = 3_200;

export type LiveMatchSource = "sportmonks" | "mock";
export type LiveMatchFeedStatus = "loading" | "live" | "stale" | "error";

export interface UseLiveMatchesOptions {
  /** Polling interval when receiving live API data (ms) */
  pollIntervalMs?: number;
  /** Mark feed stale if no successful sync within this window (ms) */
  staleAfterMs?: number;
  /** Mock simulation tick interval when in fallback mode (ms) */
  mockTickIntervalMs?: number;
}

export interface UseLiveMatchesResult {
  matches: Match[];
  signals: Signal[];
  status: LiveMatchFeedStatus;
  error: string | null;
  lastUpdated: number | null;
  source: LiveMatchSource;
  responseTime: number | null;
  isInitialLoad: boolean;
}

function hydrateMockMatches(matches: Match[]): Match[] {
  return matches.map((m) => applyPressureToMatch(m));
}

function enrichMatchesWithPressure(
  incoming: Match[],
  previousScores: Map<string, number>
): Match[] {
  return incoming.map((match) => {
    const previousScore = previousScores.get(match.id);
    const enriched = applyPressureToMatch(match, { previousScore });
    previousScores.set(match.id, enriched.pressure.score);
    return enriched;
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function tickMockMatch(match: Match): Match {
  const previousScore = match.pressure.score;
  const newMinute =
    match.minute < 90 && Math.random() > 0.65 ? match.minute + 1 : match.minute;

  const updated: Match = {
    ...match,
    minute: newMinute,
    stats: {
      shots: match.stats.shots + (Math.random() > 0.82 ? 1 : 0),
      shotsOnTarget:
        match.stats.shotsOnTarget + (Math.random() > 0.88 ? 1 : 0),
      dangerousAttacks:
        match.stats.dangerousAttacks + (Math.random() > 0.78 ? 1 : 0),
      corners: match.stats.corners + (Math.random() > 0.9 ? 1 : 0),
    },
    odds: {
      primary: clamp(
        Number((match.odds.primary + (Math.random() - 0.5) * 0.04).toFixed(2)),
        1.2,
        3.5
      ),
      over05: clamp(
        Number((match.odds.over05 + (Math.random() - 0.5) * 0.04).toFixed(2)),
        1.2,
        3.5
      ),
      over15: clamp(
        Number((match.odds.over15 + (Math.random() - 0.5) * 0.04).toFixed(2)),
        1.2,
        3.5
      ),
    },
    updatedAt: Date.now(),
  };

  return applyPressureToMatch(updated, { previousScore });
}

export function useLiveMatches(
  options: UseLiveMatchesOptions = {}
): UseLiveMatchesResult {
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const staleAfterMs = options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
  const mockTickIntervalMs = options.mockTickIntervalMs ?? MOCK_TICK_INTERVAL_MS;

  const [matches, setMatches] = useState<Match[]>(() => hydrateMockMatches(mockGames));
  const [status, setStatus] = useState<LiveMatchFeedStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [source, setSource] = useState<LiveMatchSource>("mock");
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const fetchGenerationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const pressureHistoryRef = useRef<Map<string, number>>(new Map());
  const hasLiveDataRef = useRef(false);
  const sourceRef = useRef<LiveMatchSource>("mock");

  const activateMockFallback = useCallback((message: string | null) => {
    setSource("mock");
    sourceRef.current = "mock";
    hasLiveDataRef.current = false;
    setMatches(hydrateMockMatches(mockGames));
    setError(message);
    setStatus(message ? "error" : "live");
    setLastUpdated(Date.now());
  }, []);

  const fetchLiveMatches = useCallback(async (isPoll: boolean) => {
    const generation = ++fetchGenerationRef.current;
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    if (!isPoll && !hasLiveDataRef.current) {
      setStatus("loading");
    }

    const startedAt = Date.now();

    try {
      const response = await fetch(API_PATH, {
        method: "GET",
        signal: controller.signal,
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (generation !== fetchGenerationRef.current) return;

      const body = (await response.json()) as LiveMatchesApiResponse;
      const elapsed = Date.now() - startedAt;

      if (!response.ok || !body.ok) {
        const errMsg =
          !body.ok && "error" in body
            ? body.error.message
            : `API error (${response.status})`;
        activateMockFallback(errMsg);
        setResponseTime(
          !body.ok && "meta" in body ? body.meta.responseTimeMs : elapsed
        );
        setIsInitialLoad(false);
        return;
      }

      const enriched = enrichMatchesWithPressure(
        body.matches,
        pressureHistoryRef.current
      );

      if (generation !== fetchGenerationRef.current) return;

      setMatches(enriched);
      setSource("sportmonks");
      sourceRef.current = "sportmonks";
      hasLiveDataRef.current = true;
      setError(null);
      setStatus("live");
      setLastUpdated(Date.now());
      setResponseTime(body.meta.responseTimeMs ?? elapsed);
      setIsInitialLoad(false);
    } catch (err) {
      if (generation !== fetchGenerationRef.current) return;
      if (err instanceof Error && err.name === "AbortError") return;

      const message =
        err instanceof Error ? err.message : "Failed to fetch live matches.";
      activateMockFallback(message);
      setResponseTime(Date.now() - startedAt);
      setIsInitialLoad(false);
    }
  }, [activateMockFallback]);

  useEffect(() => {
    void fetchLiveMatches(false);

    const pollId = window.setInterval(() => {
      void fetchLiveMatches(true);
    }, pollIntervalMs);

    return () => {
      window.clearInterval(pollId);
      fetchGenerationRef.current += 1;
      abortRef.current?.abort();
    };
  }, [fetchLiveMatches, pollIntervalMs]);

  useEffect(() => {
    const staleCheckId = window.setInterval(() => {
      if (sourceRef.current !== "sportmonks" || !lastUpdated) return;
      if (Date.now() - lastUpdated > staleAfterMs) {
        setStatus((current) => (current === "live" ? "stale" : current));
      }
    }, 5_000);

    return () => window.clearInterval(staleCheckId);
  }, [lastUpdated, staleAfterMs]);

  useEffect(() => {
    if (source !== "mock") return;

    const tickId = window.setInterval(() => {
      setMatches((prev) => prev.map(tickMockMatch));
      setLastUpdated(Date.now());
    }, mockTickIntervalMs);

    return () => window.clearInterval(tickId);
  }, [source, mockTickIntervalMs]);

  const signals = useMemo(() => evaluateAllGames(matches), [matches]);

  return {
    matches,
    signals,
    status,
    error,
    lastUpdated,
    source,
    responseTime,
    isInitialLoad,
  };
}
