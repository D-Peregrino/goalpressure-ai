/**
 * Persistência Supabase — api_usage_metrics.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type { ApiUsageMetricsRow, ApiUsageSnapshot } from "@/types/apiUsage";
import { logInfo, logOps, logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "api-usage-persistence";

function toRow(snapshot: ApiUsageSnapshot): ApiUsageMetricsRow {
  return {
    provider: snapshot.provider,
    requests_per_minute: snapshot.requestsPerMinute,
    requests_per_hour: snapshot.requestsPerHour,
    requests_per_day: snapshot.requestsPerDay,
    month_projection: snapshot.requestsMonthProjection,
    estimated_remaining_quota: snapshot.estimatedRemainingQuota,
    alert_level: snapshot.alertLevel,
    active_fixtures: snapshot.activeFixtures,
    polling_frequency_ms: snapshot.averagePollingFrequencyMs,
    top_endpoints: snapshot.topEndpoints,
    heatmap: snapshot.requestHeatmap,
    metadata: {
      estimated_monthly_usage: snapshot.estimatedMonthlyUsage,
      monthly_quota: snapshot.monthlyQuota,
      quota_utilization_percent: snapshot.quotaUtilizationPercent,
      plan_support_days: snapshot.planSupportDays,
      plan_support_hours: snapshot.planSupportHours,
      cache_hit_rate: snapshot.cacheHitRate,
      last_rate_limit_remaining: snapshot.lastRateLimitRemaining,
      updated_at: snapshot.updatedAt,
      ...snapshot.metadata,
    },
  };
}

export async function persistApiUsageMetric(
  snapshot: ApiUsageSnapshot
): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  const client = getSupabaseAdmin();
  if (!client) return false;

  try {
    const { error } = await client.from("api_usage_metrics").insert(toRow(snapshot));
    if (error) throw new Error(error.message);
    return true;
  } catch (error) {
    logWarn(LOG_SCOPE, "api_usage_metrics insert failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return false;
  }
}

export async function fetchRecentApiUsageMetrics(
  limit = 48
): Promise<ApiUsageMetricsRow[]> {
  if (!isSupabaseConfigured()) return [];

  const client = getSupabaseAdmin();
  if (!client) return [];

  const { data, error } = await client
    .from("api_usage_metrics")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logWarn(LOG_SCOPE, "fetch api_usage_metrics failed", { message: error.message });
    return [];
  }

  return (data ?? []) as ApiUsageMetricsRow[];
}

export async function persistApiUsageSnapshotCycle(
  snapshot: ApiUsageSnapshot
): Promise<{ persisted: boolean }> {
  const ok = await persistApiUsageMetric(snapshot);
  if (ok) {
    logOps(
      LOG_SCOPE,
      `[api-usage] persisted alert=${snapshot.alertLevel} rpm=${snapshot.requestsPerMinute} proj=${snapshot.requestsMonthProjection}`
    );
    logInfo(LOG_SCOPE, "api_usage_metrics saved", {
      alert: snapshot.alertLevel,
      utilization: snapshot.quotaUtilizationPercent,
    });
  }
  return { persisted: ok };
}
