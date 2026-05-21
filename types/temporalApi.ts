import type { TemporalOpsSnapshot } from "@/lib/temporal/temporalSnapshot";
import type { TemporalDynamicsResult, TemporalMetricsRow } from "@/types/temporal";

export interface TemporalLiveSuccessResponse {
  ok: true;
  snapshot: TemporalOpsSnapshot | null;
  live: TemporalDynamicsResult[];
  rows: TemporalMetricsRow[];
  meta: {
    fetchedAt: string;
    responseTimeMs: number;
    count: number;
  };
}

export interface TemporalLiveErrorResponse {
  ok: false;
  error: { message: string };
}

export type TemporalLiveApiResponse =
  | TemporalLiveSuccessResponse
  | TemporalLiveErrorResponse;
