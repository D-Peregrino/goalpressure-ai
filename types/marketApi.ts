import type { MarketCalibrationOpsSnapshot } from "@/lib/market/marketSnapshot";
import type { MarketEdgeRow } from "@/types/market";

export interface MarketEdgesSuccessResponse {
  ok: true;
  snapshot: MarketCalibrationOpsSnapshot | null;
  rows: MarketEdgeRow[];
  meta: {
    fetchedAt: string;
    responseTimeMs: number;
    count: number;
  };
}

export interface MarketEdgesErrorResponse {
  ok: false;
  error: { message: string };
}

export type MarketEdgesApiResponse =
  | MarketEdgesSuccessResponse
  | MarketEdgesErrorResponse;
