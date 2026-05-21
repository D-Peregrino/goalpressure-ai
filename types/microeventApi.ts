import type { MicroeventOpsSnapshot } from "@/lib/microevent/microeventSnapshot";
import type {
  MicroeventDetectionResult,
  MicroeventMetricsRow,
} from "@/types/microevent";

export interface MicroeventLiveSuccessResponse {
  ok: true;
  snapshot: MicroeventOpsSnapshot | null;
  live: MicroeventDetectionResult[];
  rows: MicroeventMetricsRow[];
  meta: {
    fetchedAt: string;
    responseTimeMs: number;
    count: number;
  };
}

export interface MicroeventLiveErrorResponse {
  ok: false;
  error: { message: string };
}

export type MicroeventLiveApiResponse =
  | MicroeventLiveSuccessResponse
  | MicroeventLiveErrorResponse;
