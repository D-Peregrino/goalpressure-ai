/**
 * Internal client for /api/live-matches — used by live polling engine.
 */

import type {
  LiveMatchesApiResponse,
  LiveMatchesSuccessResponse,
} from "@/types/api";
import { logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "live-matches-client";
const DEFAULT_TIMEOUT_MS = 25_000;

export interface FetchLiveMatchesOptions {
  baseUrl?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

function resolveBaseUrl(override?: string): string {
  if (override) return override.replace(/\/$/, "");

  const explicit = process.env.GP_INTERNAL_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const railway = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railway) return `https://${railway.replace(/^https?:\/\//, "")}`;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;

  const port = process.env.PORT ?? "3000";
  return `http://127.0.0.1:${port}`;
}

export async function fetchLiveMatchesFromApi(
  options: FetchLiveMatchesOptions = {}
): Promise<LiveMatchesSuccessResponse> {
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const url = `${baseUrl}/api/live-matches`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const signal = options.signal
    ? AbortSignal.any([options.signal, controller.signal])
    : controller.signal;

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal,
      headers: { Accept: "application/json" },
    });

    const data = (await response.json()) as LiveMatchesApiResponse;

    if (!response.ok || !data.ok) {
      const message =
        !data.ok && "error" in data
          ? data.error.message
          : `HTTP ${response.status}`;
      throw new Error(message);
    }

    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      logWarn(LOG_SCOPE, "Live matches fetch aborted or timed out", {
        url,
        timeoutMs,
      });
      throw new Error(`Live matches fetch timeout (${timeoutMs}ms)`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
