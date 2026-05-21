import type { DataQualityOpsSnapshot } from "@/lib/dataQuality/dataQualitySnapshot";
import type { DataQualityMetricsRow, DataQualityResult } from "@/types/dataQuality";

export interface DataQualityLiveSuccessResponse {
  ok: true;
  snapshot: DataQualityOpsSnapshot | null;
  live: DataQualityResult[];
  rows: DataQualityMetricsRow[];
  meta: {
    fetchedAt: string;
    responseTimeMs: number;
    count: number;
  };
}

export interface DataQualityLiveErrorResponse {
  ok: false;
  error: { message: string };
}

export type DataQualityLiveApiResponse =
  | DataQualityLiveSuccessResponse
  | DataQualityLiveErrorResponse;
