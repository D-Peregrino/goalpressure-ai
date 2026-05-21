import type { MetaOpsSnapshot } from "@/lib/meta/metaSnapshot";
import type {
  MetaConsensusResult,
  MetaConsensusMetricsRow,
} from "@/types/meta";

export interface MetaLiveSuccessResponse {
  ok: true;
  snapshot: MetaOpsSnapshot | null;
  live: MetaConsensusResult[];
  rows: MetaConsensusMetricsRow[];
  meta: {
    fetchedAt: string;
    responseTimeMs: number;
    count: number;
  };
}

export interface MetaLiveErrorResponse {
  ok: false;
  error: { message: string };
}

export type MetaLiveApiResponse =
  | MetaLiveSuccessResponse
  | MetaLiveErrorResponse;
