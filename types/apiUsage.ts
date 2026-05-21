/**
 * GoalPressure AI — API Usage Monitor (SportMonks).
 */

export type ApiUsageAlertLevel = "SAFE" | "WARNING" | "CRITICAL" | "SATURATED";

export type ApiUsageProvider = "sportmonks";

export interface ApiUsageRequestEvent {
  timestamp: number;
  provider: ApiUsageProvider;
  endpoint: string;
  method: string;
  success: boolean;
  responseMs: number;
  rateLimitRemaining?: number;
  rateLimitResetsInSeconds?: number;
  httpStatus?: number;
  cacheHit?: boolean;
  activeFixtures?: number;
  metadata?: Record<string, unknown>;
}

export interface ApiUsageEndpointStat {
  endpoint: string;
  count: number;
  sharePercent: number;
  averageResponseMs: number;
  errorCount: number;
}

export interface ApiUsageHeatmapCell {
  hour: number;
  count: number;
  intensity: number;
}

export interface ApiUsageSnapshot {
  updatedAt: string;
  provider: ApiUsageProvider;
  alertLevel: ApiUsageAlertLevel;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  requestsMonthProjection: number;
  estimatedMonthlyUsage: number;
  estimatedRemainingQuota: number | null;
  monthlyQuota: number;
  quotaUtilizationPercent: number;
  averagePollingFrequencyMs: number;
  activeFixtures: number;
  topEndpoints: ApiUsageEndpointStat[];
  requestHeatmap: ApiUsageHeatmapCell[];
  planSupportDays: number | null;
  planSupportHours: number | null;
  lastRateLimitRemaining: number | null;
  totalRequestsTracked: number;
  cacheHitRate: number;
  metadata: Record<string, unknown>;
}

export interface ApiUsageMetricsRow {
  id?: string;
  provider: string;
  requests_per_minute: number;
  requests_per_hour: number;
  requests_per_day: number;
  month_projection: number;
  estimated_remaining_quota: number | null;
  alert_level: string;
  active_fixtures: number;
  polling_frequency_ms: number;
  top_endpoints: ApiUsageEndpointStat[];
  heatmap: ApiUsageHeatmapCell[];
  metadata: Record<string, unknown>;
  created_at?: string;
}
