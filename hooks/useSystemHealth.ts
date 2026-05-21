"use client";

import { useCallback, useEffect, useState } from "react";

export interface SystemHealthReport {
  status: string;
  uptime?: number;
  database?: { mode?: string; connected?: boolean };
  telegram?: { status?: string; configured?: boolean };
  liveFeed?: { status?: string };
  timestamp?: string;
}

export function useSystemHealth(pollMs = 30_000) {
  const [health, setHealth] = useState<SystemHealthReport | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const data = (await res.json()) as SystemHealthReport;
      setHealth(data);
    } catch {
      setHealth({ status: "unknown" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHealth();
    const id = setInterval(() => void fetchHealth(), pollMs);
    return () => clearInterval(id);
  }, [fetchHealth, pollMs]);

  return { health, loading };
}
