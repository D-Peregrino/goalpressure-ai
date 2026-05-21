import type { Match } from "@/types/domain";

export const LIVE_MATCHES_CACHE_TTL_MS = 20_000;

export type LiveMatchesCacheStatus = "HIT" | "MISS" | "STALE";

export interface LiveMatchesCacheEntry {
  matches: Match[];
  fetchedAt: number;
  expiresAt: number;
  rateLimitRemaining?: number;
  rateLimitResetsInSeconds?: number;
}

/** In-memory cache (single Node process; no Redis in this phase). */
let cacheStore: LiveMatchesCacheEntry | null = null;

export function getLiveMatchesCacheEntry(): LiveMatchesCacheEntry | null {
  return cacheStore;
}

export function isLiveMatchesCacheValid(entry: LiveMatchesCacheEntry): boolean {
  return Date.now() < entry.expiresAt;
}

export function setLiveMatchesCacheEntry(
  payload: Omit<LiveMatchesCacheEntry, "fetchedAt" | "expiresAt"> & {
    fetchedAt?: number;
  }
): LiveMatchesCacheEntry {
  const fetchedAt = payload.fetchedAt ?? Date.now();
  const entry: LiveMatchesCacheEntry = {
    matches: payload.matches,
    fetchedAt,
    expiresAt: fetchedAt + LIVE_MATCHES_CACHE_TTL_MS,
    rateLimitRemaining: payload.rateLimitRemaining,
    rateLimitResetsInSeconds: payload.rateLimitResetsInSeconds,
  };
  cacheStore = entry;
  return entry;
}

export function getCacheAgeMs(entry: LiveMatchesCacheEntry, now = Date.now()): number {
  return Math.max(0, now - entry.fetchedAt);
}

export function getCacheExpiresInMs(
  entry: LiveMatchesCacheEntry,
  now = Date.now()
): number {
  return Math.max(0, entry.expiresAt - now);
}
