"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ActiveDataSource } from "@/lib/data-source/config";
import { generateLiveSignals } from "@/lib/engine/signals/liveSignalGenerator";
import { applyPressureToMatch } from "@/lib/pressureScore";
import type { LiveMatchesApiResponse } from "@/types/api";
import type { DispatchEngineSnapshot } from "@/lib/execution/execution.types";
import type { AutonomousCoreSnapshot } from "@/lib/autonomous/autonomous.types";
import type { Match, Signal } from "@/types/domain";

const API_PATH = "/api/live-matches";
const DEFAULT_POLL_INTERVAL_MS = 30_000;
const DEFAULT_STALE_AFTER_MS = 45_000;

export type LiveMatchSource = ActiveDataSource;
export type LiveMatchFeedStatus = "loading" | "live" | "stale" | "error" | "empty";

export interface UseLiveMatchesOptions {
  pollIntervalMs?: number;
  staleAfterMs?: number;
}

export interface UseLiveMatchesResult {
  matches: Match[];
  signals: Signal[];
  status: LiveMatchFeedStatus;
  error: string | null;
  lastUpdated: number | null;
  source: LiveMatchSource;
  activeSource: LiveMatchSource;
  dataSourceBadge: string | null;
  responseTime: number | null;
  isInitialLoad: boolean;
  isEmpty: boolean;
  sportmonksError: { httpStatus?: number; message: string; endpoint?: string } | null;
  dispatchSnapshot: DispatchEngineSnapshot | null;
  autonomousSnapshot: AutonomousCoreSnapshot | null;
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

export function useLiveMatches(
  options: UseLiveMatchesOptions = {}
): UseLiveMatchesResult {
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const staleAfterMs = options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;

  const [matches, setMatches] = useState<Match[]>([]);
  const [status, setStatus] = useState<LiveMatchFeedStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [source, setSource] = useState<LiveMatchSource>("none");
  const [dataSourceBadge, setDataSourceBadge] = useState<string | null>(null);
  const [sportmonksError, setSportmonksError] = useState<UseLiveMatchesResult["sportmonksError"]>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);

  const fetchGenerationRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const pressureHistoryRef = useRef<Map<string, number>>(new Map());
  const [apiSignals, setApiSignals] = useState<Signal[] | null>(null);
  const [dispatchSnapshot, setDispatchSnapshot] =
    useState<DispatchEngineSnapshot | null>(null);
  const [autonomousSnapshot, setAutonomousSnapshot] =
    useState<AutonomousCoreSnapshot | null>(null);
  const hasLiveDataRef = useRef(false);
  const sourceRef = useRef<LiveMatchSource>("none");

  const applyApiFailure = useCallback((message: string, activeSource: LiveMatchSource) => {
      setMatches([]);
      setSource(activeSource);
      sourceRef.current = activeSource;
      hasLiveDataRef.current = false;
      setApiSignals(null);
      setError(message);
      setStatus("error");
      setLastUpdated(Date.now());
    },
    []
  );

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

      const activeSource =
        ("meta" in body && body.meta && "activeSource" in body.meta
          ? body.meta.activeSource
          : undefined) ?? "sportmonks";

      if (!response.ok || !body.ok) {
        const errMsg =
          !body.ok && "error" in body
            ? body.error.message
            : `API error (${response.status})`;
        const smErr =
          !body.ok && "meta" in body ? body.meta.sportmonksError ?? null : null;
        setSportmonksError(smErr);
        setDataSourceBadge(null);
        applyApiFailure(errMsg, activeSource);
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

      const resolvedSource = body.meta.activeSource ?? body.meta.source ?? "sportmonks";

      setMatches(enriched);
      setApiSignals(body.signals ?? null);
      setDispatchSnapshot(
        body.dispatch ?? body.engine?.dispatch ?? null
      );
      setAutonomousSnapshot(
        body.autonomous ?? body.engine?.autonomous ?? null
      );
      setSource(resolvedSource);
      sourceRef.current = resolvedSource;
      hasLiveDataRef.current = true;
      setError(null);
      setSportmonksError(null);
      setDataSourceBadge(body.meta.dataSourceBadge ?? null);
      const emptyFeed =
        Boolean(body.empty) ||
        Boolean(body.meta.empty) ||
        (resolvedSource === "sportmonks" && enriched.length === 0);
      setIsEmpty(emptyFeed);
      setStatus(emptyFeed ? "empty" : "live");
      setLastUpdated(Date.now());
      setResponseTime(body.meta.responseTimeMs ?? elapsed);
      setIsInitialLoad(false);
    } catch (err) {
      if (generation !== fetchGenerationRef.current) return;
      if (err instanceof Error && err.name === "AbortError") return;

      const message =
        err instanceof Error ? err.message : "Failed to fetch live matches.";
      setSportmonksError(null);
      setDataSourceBadge(null);
      applyApiFailure(message, "sportmonks");
      setResponseTime(Date.now() - startedAt);
      setIsInitialLoad(false);
    }
  }, [applyApiFailure]);

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

  const signals = useMemo(() => {
    if (source === "sportmonks" && apiSignals) return apiSignals;
    if (source === "seed" && apiSignals) return apiSignals;
    if (matches.length === 0) return [];
    return generateLiveSignals(matches).signals;
  }, [matches, source, apiSignals]);

  return {
    matches,
    signals,
    status,
    error,
    lastUpdated,
    source,
    activeSource: source,
    dataSourceBadge,
    responseTime,
    isInitialLoad,
    isEmpty,
    sportmonksError,
    dispatchSnapshot,
    autonomousSnapshot,
  };
}
