"use client";

import { useCallback, useEffect, useState } from "react";
import type { OpsCenterPayload } from "@/lib/ops/opsCenter.types";

interface CenterResponse {
  ok: boolean;
  center?: OpsCenterPayload;
  error?: string;
}

export function useOpsCenter(pollMs = 20_000) {
  const [center, setCenter] = useState<OpsCenterPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/ops/center");
      const body = (await res.json()) as CenterResponse;
      if (!res.ok || !body.ok || !body.center) {
        setError(body.error ?? "Falha ao carregar OPS Center");
        return;
      }
      setCenter(body.center);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro de rede");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  return { center, loading, error, refresh };
}
