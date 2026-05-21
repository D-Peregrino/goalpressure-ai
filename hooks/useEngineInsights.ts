"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EngineInsightsApiResponse } from "@/app/api/engine-insights/route";
import type { LiveEngineSnapshot } from "@/types/engine";

const API_PATH = "/api/engine-insights";
const DEFAULT_POLL_MS = 20_000;

export interface UseEngineInsightsResult {
  engine: LiveEngineSnapshot | null;
  dispatchQueueSize: number;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

export function useEngineInsights(pollMs = DEFAULT_POLL_MS): UseEngineInsightsResult {
  const [engine, setEngine] = useState<LiveEngineSnapshot | null>(null);
  const [dispatchQueueSize, setDispatchQueueSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchInsights = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(API_PATH, {
        signal: controller.signal,
        cache: "no-store",
      });
      const body = (await res.json()) as EngineInsightsApiResponse;

      if (!res.ok || !body.ok) {
        setError("Engine insights unavailable");
        return;
      }

      setEngine(body.engine);
      setDispatchQueueSize(body.dispatchQueueSize);
      setError(null);
      setLastUpdated(Date.now());
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to load engine");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchInsights();
    const id = window.setInterval(() => void fetchInsights(), pollMs);
    return () => {
      window.clearInterval(id);
      abortRef.current?.abort();
    };
  }, [fetchInsights, pollMs]);

  return { engine, dispatchQueueSize, loading, error, lastUpdated };
}
