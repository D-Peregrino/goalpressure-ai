"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchWithAuth } from "@/lib/auth/fetchWithAuth";
import type { SmartWorkspacePayload } from "@/lib/personalization/types";

export function useSmartWorkspace() {
  const { user, loading: authLoading } = useAuth();
  const [smart, setSmart] = useState<SmartWorkspacePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setSmart(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/workspace/smart");
      const body = (await res.json()) as {
        ok: boolean;
        smart?: SmartWorkspacePayload;
        error?: string;
      };
      if (!res.ok || !body.ok || !body.smart) {
        setError(body.error ?? "Falha ao carregar perfil smart");
        return;
      }
      setSmart(body.smart);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro de rede");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  return { smart, loading: loading || authLoading, error, refresh };
}
