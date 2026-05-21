import type { SequenceOpsSnapshot } from "@/lib/sequence/sequenceSnapshot";
import type {
  SequenceMemoryResult,
  SequenceMemoryMetricsRow,
} from "@/types/sequence";

export interface SequenceLiveSuccessResponse {
  ok: true;
  snapshot: SequenceOpsSnapshot | null;
  live: SequenceMemoryResult[];
  rows: SequenceMemoryMetricsRow[];
  meta: {
    fetchedAt: string;
    responseTimeMs: number;
    count: number;
  };
}

export interface SequenceLiveErrorResponse {
  ok: false;
  error: { message: string };
}

export type SequenceLiveApiResponse =
  | SequenceLiveSuccessResponse
  | SequenceLiveErrorResponse;
