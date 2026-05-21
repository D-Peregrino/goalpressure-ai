import type { ApiUsageMetricsRow, ApiUsageSnapshot } from "@/types/apiUsage";

export interface ApiUsageApiSuccess {
  ok: true;
  snapshot: ApiUsageSnapshot;
  rows: ApiUsageMetricsRow[];
  meta: {
    fetchedAt: string;
    responseTimeMs: number;
    monthlyQuota: number;
  };
}

export interface ApiUsageApiError {
  ok: false;
  error: { message: string };
}

export type ApiUsageApiResponse = ApiUsageApiSuccess | ApiUsageApiError;
