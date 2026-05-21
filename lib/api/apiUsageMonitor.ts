/**
 * GoalPressure AI — Institutional API Usage Monitor (SportMonks).
 * Tracks real HTTP consumption and projects plan saturation.
 */

import type {
  ApiUsageAlertLevel,
  ApiUsageEndpointStat,
  ApiUsageHeatmapCell,
  ApiUsageProvider,
  ApiUsageRequestEvent,
  ApiUsageSnapshot,
} from "@/types/apiUsage";
import { logOps } from "@/lib/utils/logger";

export const LOG_SCOPE = "api-usage-monitor";

const MS_MINUTE = 60_000;
const MS_HOUR = 3_600_000;
const MS_DAY = 86_400_000;
const MAX_EVENTS = 8_000;
const DEFAULT_MONTHLY_QUOTA = 3_000;
const DEFAULT_POLLING_MS = 15_000;

interface PollingSample {
  at: number;
  intervalMs: number;
  activeFixtures: number;
  cacheHit: boolean;
}

interface GlobalApiUsageSlot {
  events: ApiUsageRequestEvent[];
  pollingSamples: PollingSample[];
  lastSnapshot: ApiUsageSnapshot | null;
  monthlyQuota: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_API_USAGE__: GlobalApiUsageSlot | undefined;
}

function getSlot(): GlobalApiUsageSlot {
  if (!globalThis.__GP_API_USAGE__) {
    const quotaRaw = process.env.SPORTMONKS_MONTHLY_QUOTA;
    const parsed = quotaRaw ? Number.parseInt(quotaRaw, 10) : NaN;
    globalThis.__GP_API_USAGE__ = {
      events: [],
      pollingSamples: [],
      lastSnapshot: null,
      monthlyQuota:
        Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MONTHLY_QUOTA,
    };
  }
  return globalThis.__GP_API_USAGE__;
}

function pruneEvents(events: ApiUsageRequestEvent[], now: number): ApiUsageRequestEvent[] {
  const cutoff = now - MS_DAY * 2;
  const pruned = events.filter((e) => e.timestamp >= cutoff);
  if (pruned.length > MAX_EVENTS) {
    return pruned.slice(pruned.length - MAX_EVENTS);
  }
  return pruned;
}

function countInWindow(events: ApiUsageRequestEvent[], now: number, windowMs: number): number {
  const cutoff = now - windowMs;
  return events.filter((e) => e.timestamp >= cutoff && !e.cacheHit).length;
}

function resolveAlertLevel(utilizationPercent: number, remaining: number | null, quota: number): ApiUsageAlertLevel {
  if (remaining !== null && remaining <= 0) return "SATURATED";
  if (utilizationPercent >= 95) return "SATURATED";
  if (utilizationPercent >= 80) return "CRITICAL";
  if (utilizationPercent >= 60) return "WARNING";
  return "SAFE";
}

function buildTopEndpoints(events: ApiUsageRequestEvent[], now: number): ApiUsageEndpointStat[] {
  const cutoff = now - MS_DAY;
  const recent = events.filter((e) => e.timestamp >= cutoff && !e.cacheHit);
  const total = recent.length || 1;
  const map = new Map<
    string,
    { count: number; responseSum: number; errors: number }
  >();

  for (const e of recent) {
    const cur = map.get(e.endpoint) ?? { count: 0, responseSum: 0, errors: 0 };
    cur.count += 1;
    cur.responseSum += e.responseMs;
    if (!e.success) cur.errors += 1;
    map.set(e.endpoint, cur);
  }

  return [...map.entries()]
    .map(([endpoint, v]) => ({
      endpoint,
      count: v.count,
      sharePercent: Math.round((v.count / total) * 1000) / 10,
      averageResponseMs: Math.round(v.responseSum / v.count),
      errorCount: v.errors,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function buildHeatmap(events: ApiUsageRequestEvent[], now: number): ApiUsageHeatmapCell[] {
  const cutoff = now - MS_DAY;
  const counts = new Array(24).fill(0) as number[];

  for (const e of events) {
    if (e.timestamp < cutoff || e.cacheHit) continue;
    const hour = new Date(e.timestamp).getHours();
    counts[hour] += 1;
  }

  const max = Math.max(1, ...counts);

  return counts.map((count, hour) => ({
    hour,
    count,
    intensity: Math.round((count / max) * 100),
  }));
}

function averagePollingMs(samples: PollingSample[]): number {
  if (samples.length === 0) return DEFAULT_POLLING_MS;
  const sum = samples.reduce((s, p) => s + p.intervalMs, 0);
  return Math.round(sum / samples.length);
}

function latestActiveFixtures(samples: PollingSample[]): number {
  if (samples.length === 0) return 0;
  return samples[samples.length - 1]?.activeFixtures ?? 0;
}

function cacheHitRate(events: ApiUsageRequestEvent[], now: number): number {
  const cutoff = now - MS_HOUR;
  const recent = events.filter((e) => e.timestamp >= cutoff);
  if (recent.length === 0) return 0;
  const hits = recent.filter((e) => e.cacheHit).length;
  return Math.round((hits / recent.length) * 1000) / 1000;
}

function planSupportDuration(
  remaining: number | null,
  dailyBurn: number
): { days: number | null; hours: number | null } {
  if (remaining === null || remaining <= 0 || dailyBurn <= 0) {
    return { days: null, hours: null };
  }
  const days = remaining / dailyBurn;
  return {
    days: Math.round(days * 10) / 10,
    hours: Math.round(days * 24 * 10) / 10,
  };
}

/**
 * Registra uma chamada HTTP real à SportMonks (ou evento de cache no polling).
 */
export function recordApiUsageEvent(
  event: Omit<ApiUsageRequestEvent, "timestamp" | "provider"> & {
    timestamp?: number;
    provider?: ApiUsageProvider;
  }
): void {
  const slot = getSlot();
  const now = event.timestamp ?? Date.now();
  const full: ApiUsageRequestEvent = {
    timestamp: now,
    provider: event.provider ?? "sportmonks",
    endpoint: event.endpoint,
    method: event.method ?? "GET",
    success: event.success,
    responseMs: event.responseMs,
    rateLimitRemaining: event.rateLimitRemaining,
    rateLimitResetsInSeconds: event.rateLimitResetsInSeconds,
    httpStatus: event.httpStatus,
    cacheHit: event.cacheHit ?? false,
    activeFixtures: event.activeFixtures,
    metadata: event.metadata,
  };

  slot.events.push(full);
  slot.events = pruneEvents(slot.events, now);

  if (!full.cacheHit) {
    logOps(
      LOG_SCOPE,
      `[api-usage] ${full.endpoint} ${full.success ? "ok" : "fail"} ${full.responseMs}ms remaining=${full.rateLimitRemaining ?? "n/a"}`
    );
  }
}

/**
 * Registra ciclo de polling (frequência efetiva + fixtures ativos).
 */
export function recordPollingCycleSample(input: {
  intervalMs: number;
  activeFixtures: number;
  cacheHit: boolean;
}): void {
  const slot = getSlot();
  slot.pollingSamples.push({
    at: Date.now(),
    intervalMs: input.intervalMs,
    activeFixtures: input.activeFixtures,
    cacheHit: input.cacheHit,
  });
  if (slot.pollingSamples.length > 500) {
    slot.pollingSamples = slot.pollingSamples.slice(-500);
  }

  recordApiUsageEvent({
    endpoint: "/internal/polling-cycle",
    method: "POLL",
    success: true,
    responseMs: 0,
    cacheHit: input.cacheHit,
    activeFixtures: input.activeFixtures,
    metadata: { intervalMs: input.intervalMs },
  });
}

/**
 * Monta snapshot institucional para Ops e API.
 */
export function buildApiUsageSnapshot(
  activeFixturesOverride?: number
): ApiUsageSnapshot {
  const slot = getSlot();
  const now = Date.now();
  const events = slot.events;
  const quota = slot.monthlyQuota;

  const rpm = countInWindow(events, now, MS_MINUTE);
  const rph = countInWindow(events, now, MS_HOUR);
  const rpd = countInWindow(events, now, MS_DAY);

  const dayOfMonth = new Date(now).getDate();
  const daysElapsed = Math.max(1, dayOfMonth);
  const monthProjectionFromDay = Math.round((rpd / daysElapsed) * 30);
  const monthProjectionFromHour = Math.round(rph * 24 * 30);
  const requestsMonthProjection = Math.max(
    monthProjectionFromDay,
    monthProjectionFromHour
  );

  const lastWithRemaining = [...events]
    .reverse()
    .find((e) => e.rateLimitRemaining != null && !e.cacheHit);

  const lastRateLimitRemaining = lastWithRemaining?.rateLimitRemaining ?? null;
  const estimatedRemainingQuota = lastRateLimitRemaining;

  const estimatedMonthlyUsage = requestsMonthProjection;
  const quotaUtilizationPercent =
    quota > 0
      ? Math.min(100, Math.round((estimatedMonthlyUsage / quota) * 1000) / 10)
      : 0;

  const alertLevel = resolveAlertLevel(
    quotaUtilizationPercent,
    estimatedRemainingQuota,
    quota
  );

  const dailyBurn = Math.max(rpd, rpm * 60 * 24 * 0.1);
  const support = planSupportDuration(estimatedRemainingQuota, dailyBurn);

  const pollingMs = averagePollingMs(slot.pollingSamples);
  const activeFixtures =
    activeFixturesOverride ?? latestActiveFixtures(slot.pollingSamples);

  const snapshot: ApiUsageSnapshot = {
    updatedAt: new Date(now).toISOString(),
    provider: "sportmonks",
    alertLevel,
    requestsPerMinute: rpm,
    requestsPerHour: rph,
    requestsPerDay: rpd,
    requestsMonthProjection,
    estimatedMonthlyUsage,
    estimatedRemainingQuota,
    monthlyQuota: quota,
    quotaUtilizationPercent,
    averagePollingFrequencyMs: pollingMs,
    activeFixtures,
    topEndpoints: buildTopEndpoints(events, now),
    requestHeatmap: buildHeatmap(events, now),
    planSupportDays: support.days,
    planSupportHours: support.hours,
    lastRateLimitRemaining,
    totalRequestsTracked: events.filter((e) => !e.cacheHit).length,
    cacheHitRate: cacheHitRate(events, now),
    metadata: {
      monthProjectionFromDay,
      monthProjectionFromHour,
      planLabel: process.env.SPORTMONKS_PLAN_NAME ?? "default",
    },
  };

  slot.lastSnapshot = snapshot;

  if (alertLevel !== "SAFE") {
    logOps(
      LOG_SCOPE,
      `[api-usage] alert=${alertLevel} utilization=${quotaUtilizationPercent}% projected=${requestsMonthProjection}/${quota} supportDays=${support.days ?? "n/a"}`
    );
  }

  return snapshot;
}

export function getApiUsageSnapshot(): ApiUsageSnapshot | null {
  return getSlot().lastSnapshot ?? buildApiUsageSnapshot();
}

export function getMonthlyQuota(): number {
  return getSlot().monthlyQuota;
}

/** Limpa histórico (testes). */
export function resetApiUsageMonitor(): void {
  globalThis.__GP_API_USAGE__ = undefined;
}
