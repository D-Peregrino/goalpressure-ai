"use client";

import { useCallback, useEffect, useState } from "react";
import type { Match } from "@/types/domain";

interface ScheduleResponse {
  ok: boolean;
  matches: Match[];
  error?: string;
}

export function useTerminalSchedule(pollMs = 60_000) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/terminal/schedule", { cache: "no-store" });
      const body = (await res.json()) as ScheduleResponse;
      if (!res.ok || !body.ok) {
        setMatches([]);
        setError(body.error ?? "Agenda indisponível");
        return;
      }
      setMatches(body.matches ?? []);
      setError(null);
    } catch {
      setMatches([]);
      setError("Falha ao carregar agenda");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), pollMs);
    return () => window.clearInterval(id);
  }, [load, pollMs]);

  return { matches, loading, error };
}
