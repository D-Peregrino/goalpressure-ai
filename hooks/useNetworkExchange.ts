"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchWithAuth } from "@/lib/auth/fetchWithAuth";
import type {
  NetworkFeedPayload,
  PostSignalInput,
  PostVoteInput,
  SharedSignal,
} from "@/lib/network/network.types";

interface FeedResponse {
  ok: boolean;
  feed?: NetworkFeedPayload;
  error?: string;
}

export function useNetworkExchange(pollMs = 45_000) {
  const { user, loading: authLoading } = useAuth();
  const [feed, setFeed] = useState<NetworkFeedPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/network/feed");
      const body = (await res.json()) as FeedResponse;
      if (!res.ok || !body.ok || !body.feed) {
        setError(body.error ?? "Falha ao carregar rede");
        return;
      }
      setFeed(body.feed);
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

  const postSignal = useCallback(
    async (input: PostSignalInput): Promise<SharedSignal | null> => {
      if (!user) return null;
      setPosting(true);
      try {
        const res = await fetchWithAuth("/api/network/signal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const body = (await res.json()) as { ok: boolean; signal?: SharedSignal };
        if (res.ok && body.ok && body.signal) {
          await refresh();
          return body.signal;
        }
        return null;
      } finally {
        setPosting(false);
      }
    },
    [user, refresh]
  );

  const postVote = useCallback(
    async (input: PostVoteInput): Promise<boolean> => {
      if (!user) return false;
      const res = await fetchWithAuth("/api/network/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (res.ok) await refresh();
      return res.ok;
    },
    [user, refresh]
  );

  return {
    feed,
    loading: loading || authLoading,
    error,
    posting,
    refresh,
    postSignal,
    postVote,
    canInteract: Boolean(user),
  };
}
