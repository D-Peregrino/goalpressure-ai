/**
 * Basic in-memory rate limiting for public API routes.
 * Suitable for single-instance Railway/Docker; use Redis for multi-region scale later.
 */

import { NextResponse } from "next/server";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

const DEFAULT_LIMIT = 120;
const DEFAULT_WINDOW_MS = 60_000;

/** Paths excluded from rate limiting (monitoring). */
const EXCLUDED_PATHS = new Set(["/api/health"]);

export interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSec: number;
}

function getClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "anonymous";
}

export function checkRateLimit(
  request: Request,
  pathname: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  if (EXCLUDED_PATHS.has(pathname)) {
    return {
      allowed: true,
      limit: options.limit ?? DEFAULT_LIMIT,
      remaining: options.limit ?? DEFAULT_LIMIT,
      retryAfterSec: 0,
    };
  }

  const limit = options.limit ?? DEFAULT_LIMIT;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const key = `${pathname}:${getClientKey(request)}`;
  const now = Date.now();

  let bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  const remaining = Math.max(0, limit - bucket.count);
  const retryAfterSec = Math.max(
    0,
    Math.ceil((bucket.resetAt - now) / 1000)
  );

  return {
    allowed: bucket.count <= limit,
    limit,
    remaining,
    retryAfterSec,
  };
}

export function rateLimitResponse(
  result: RateLimitResult
): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Please slow down.",
      },
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSec),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    }
  );
}

/** Prune stale buckets periodically (call from middleware). */
export function pruneRateLimitBuckets(): void {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}
