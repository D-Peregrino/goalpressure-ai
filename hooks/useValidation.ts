"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ValidationLiveApiResponse } from "@/types/validationApi";
import type { ValidationOpsSnapshot } from "@/lib/validation/validationSnapshot";
import type {
  CalibrationSuggestion,
  LiveValidationResult,
  ValidationLabSnapshot,
  ValidationMetricsRow,
} from "@/types/validation";

const LIVE_PATH = "/api/validation/live";
const POLL_MS = 20_000;

export type ValidationFeedStatus = "loading" | "ready" | "error";

export interface UseValidationResult {
  snapshot: ValidationOpsSnapshot | null;
  lab: ValidationLabSnapshot | null;
  live: LiveValidationResult[];
  metricsRows: ValidationMetricsRow[];
  suggestions: CalibrationSuggestion[];
  status: ValidationFeedStatus;
  error: string | null;
  lastUpdated: number | null;
  refresh: () => Promise<void>;
}

export function useValidation(): UseValidationResult {
  const [snapshot, setSnapshot] = useState<ValidationOpsSnapshot | null>(null);
  const [lab, setLab] = useState<ValidationLabSnapshot | null>(null);
  const [live, setLive] = useState<LiveValidationResult[]>([]);
  const [metricsRows, setMetricsRows] = useState<ValidationMetricsRow[]>([]);
  const [status, setStatus] = useState<ValidationFeedStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const requestIdRef = useRef(0);

  const fetchLive = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const res = await fetch(LIVE_PATH, { cache: "no-store" });
      const data = (await res.json()) as ValidationLiveApiResponse;

      if (requestId !== requestIdRef.current) return;

      if (!res.ok || !data.ok) {
        setError(
          !data.ok && "error" in data
            ? data.error.message
            : `HTTP ${res.status}`
        );
        setStatus("error");
        return;
      }

      setSnapshot(data.snapshot);
      setLab(data.lab);
      setLive(data.live);
      setMetricsRows(data.metricsRows);
      setLastUpdated(Date.now());
      setError(null);
      setStatus("ready");
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to load validation");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void fetchLive();
    const id = setInterval(() => void fetchLive(), POLL_MS);
    return () => {
      clearInterval(id);
      requestIdRef.current += 1;
    };
  }, [fetchLive]);

  const suggestions = lab?.calibrationSuggestions ?? [];

  return {
    snapshot,
    lab,
    live,
    metricsRows,
    suggestions,
    status,
    error,
    lastUpdated,
    refresh: fetchLive,
  };
}
