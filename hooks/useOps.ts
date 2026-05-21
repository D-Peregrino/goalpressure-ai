"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  OpsApiResponse,
  OpsCounterMetrics,
  OpsDispatchRecord,
  OpsLivePressureSnapshot,
  OpsLogEntry,
  OpsQueueMetrics,
  OpsTelegramStatus,
} from "@/types/opsApi";

const API_PATH = "/api/ops";
const DEFAULT_POLL_INTERVAL_MS = 15_000;

export type OpsFeedStatus = "loading" | "live" | "error";

export interface UseOpsOptions {
  pollIntervalMs?: number;
}

export interface UseOpsResult {
  telegram: OpsTelegramStatus | null;
  queue: OpsQueueMetrics | null;
  counters: OpsCounterMetrics | null;
  recentDispatches: OpsDispatchRecord[];
  logs: OpsLogEntry[];
  livePressure: OpsLivePressureSnapshot | null;
  status: OpsFeedStatus;
  error: string | null;
  lastUpdated: number | null;
  responseTime: number | null;
  isInitialLoad: boolean;
}

export function useOps(options: UseOpsOptions = {}): UseOpsResult {
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;

  const [telegram, setTelegram] = useState<OpsTelegramStatus | null>(null);
  const [queue, setQueue] = useState<OpsQueueMetrics | null>(null);
  const [counters, setCounters] = useState<OpsCounterMetrics | null>(null);
  const [recentDispatches, setRecentDispatches] = useState<OpsDispatchRecord[]>(
    []
  );
  const [logs, setLogs] = useState<OpsLogEntry[]>([]);
  const [livePressure, setLivePressure] =
    useState<OpsLivePressureSnapshot | null>(null);
  const [status, setStatus] = useState<OpsFeedStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const fetchOps = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(API_PATH, {
        signal: controller.signal,
        cache: "no-store",
      });

      const data = (await res.json()) as OpsApiResponse;

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

      setTelegram(data.telegram);
      setQueue(data.queue);
      setCounters(data.counters);
      setRecentDispatches(data.recentDispatches);
      setLogs(data.logs);
      setLivePressure(data.livePressure);
      setResponseTime(data.meta.responseTimeMs);
      setLastUpdated(Date.now());
      setError(null);
      setStatus("live");
      setIsInitialLoad(false);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      if (err instanceof DOMException && err.name === "AbortError") return;

      setError(err instanceof Error ? err.message : "Failed to load ops");
      setStatus("error");
      setIsInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    void fetchOps();
    const interval = setInterval(() => {
      void fetchOps();
    }, pollIntervalMs);

    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [fetchOps, pollIntervalMs]);

  return {
    telegram,
    queue,
    counters,
    recentDispatches,
    logs,
    livePressure,
    status,
    error,
    lastUpdated,
    responseTime,
    isInitialLoad,
  };
}
