"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AnalyticsApiResponse,
  AnalyticsSourceStatus,
  RecentResolvedSignalRow,
} from "@/types/analyticsApi";
import type { SignalAnalyticsSummary } from "@/lib/analytics/signalAnalytics";

const API_PATH = "/api/analytics";
const DEFAULT_POLL_INTERVAL_MS = 60_000;

export type AnalyticsFeedStatus = "loading" | "live" | "error";

export interface UseAnalyticsOptions {
  pollIntervalMs?: number;
}

export interface UseAnalyticsResult {
  summary: SignalAnalyticsSummary | null;
  recentResolved: RecentResolvedSignalRow[];
  status: AnalyticsFeedStatus;
  sourceStatus: AnalyticsSourceStatus | null;
  signalsProcessed: number;
  error: string | null;
  lastUpdated: number | null;
  responseTime: number | null;
  isInitialLoad: boolean;
}

export function useAnalytics(
  options: UseAnalyticsOptions = {}
): UseAnalyticsResult {
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;

  const [summary, setSummary] = useState<SignalAnalyticsSummary | null>(null);
  const [recentResolved, setRecentResolved] = useState<RecentResolvedSignalRow[]>(
    []
  );
  const [status, setStatus] = useState<AnalyticsFeedStatus>("loading");
  const [sourceStatus, setSourceStatus] =
    useState<AnalyticsSourceStatus | null>(null);
  const [signalsProcessed, setSignalsProcessed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const fetchAnalytics = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(API_PATH, {
        signal: controller.signal,
        cache: "no-store",
      });

      const data = (await res.json()) as AnalyticsApiResponse;

      if (requestId !== requestIdRef.current) return;

      if (!res.ok || !data.ok) {
        const message =
          !data.ok && "error" in data
            ? data.error.message
            : `HTTP ${res.status}`;
        setError(message);
        setStatus("error");
        setIsInitialLoad(false);
        return;
      }

      setSummary(data.summary);
      setRecentResolved(data.recentResolved);
      setSourceStatus(data.meta.sourceStatus);
      setSignalsProcessed(data.meta.signalsProcessed);
      setResponseTime(data.meta.responseTimeMs);
      setLastUpdated(Date.now());
      setError(null);
      setStatus("live");
      setIsInitialLoad(false);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      if (err instanceof DOMException && err.name === "AbortError") return;

      setError(err instanceof Error ? err.message : "Failed to load analytics");
      setStatus("error");
      setIsInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    void fetchAnalytics();
    const interval = setInterval(() => {
      void fetchAnalytics();
    }, pollIntervalMs);

    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [fetchAnalytics, pollIntervalMs]);

  return {
    summary,
    recentResolved,
    status,
    sourceStatus,
    signalsProcessed,
    error,
    lastUpdated,
    responseTime,
    isInitialLoad,
  };
}
