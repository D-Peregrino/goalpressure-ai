"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ModelComparisonDocument } from "@/lib/analytics/modelComparison";
import type { ModelRecommendationsDocument } from "@/lib/analytics/modelRecommendations";
import type { ExperimentalSignalsDocument } from "@/lib/experimental/experimentalSignalEngine";
import type {
  ResearchApiResponse,
  ResearchSourceStatus,
} from "@/types/researchApi";

const API_PATH = "/api/research";
const DEFAULT_POLL_INTERVAL_MS = 60_000;

export type ResearchFeedStatus = "loading" | "live" | "error";

export interface UseResearchOptions {
  pollIntervalMs?: number;
}

export interface UseResearchResult {
  modelComparison: ModelComparisonDocument | null;
  experimental: ExperimentalSignalsDocument | null;
  recommendations: ModelRecommendationsDocument | null;
  status: ResearchFeedStatus;
  sourceStatus: ResearchSourceStatus | null;
  error: string | null;
  lastUpdated: number | null;
  responseTime: number | null;
  isInitialLoad: boolean;
}

export function useResearch(
  options: UseResearchOptions = {}
): UseResearchResult {
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;

  const [modelComparison, setModelComparison] =
    useState<ModelComparisonDocument | null>(null);
  const [experimental, setExperimental] =
    useState<ExperimentalSignalsDocument | null>(null);
  const [recommendations, setRecommendations] =
    useState<ModelRecommendationsDocument | null>(null);
  const [status, setStatus] = useState<ResearchFeedStatus>("loading");
  const [sourceStatus, setSourceStatus] =
    useState<ResearchSourceStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const fetchResearch = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(API_PATH, {
        signal: controller.signal,
        cache: "no-store",
      });

      const data = (await res.json()) as ResearchApiResponse;

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

      setModelComparison(data.modelComparison);
      setExperimental(data.experimental);
      setRecommendations(data.recommendations);
      setSourceStatus(data.meta.sourceStatus);
      setResponseTime(data.meta.responseTimeMs);
      setLastUpdated(Date.now());
      setError(null);
      setStatus("live");
      setIsInitialLoad(false);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      if (err instanceof DOMException && err.name === "AbortError") return;

      setError(err instanceof Error ? err.message : "Failed to load research");
      setStatus("error");
      setIsInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    void fetchResearch();
    const interval = setInterval(() => {
      void fetchResearch();
    }, pollIntervalMs);

    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [fetchResearch, pollIntervalMs]);

  return {
    modelComparison,
    experimental,
    recommendations,
    status,
    sourceStatus,
    error,
    lastUpdated,
    responseTime,
    isInitialLoad,
  };
}
