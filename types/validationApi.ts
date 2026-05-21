import type { ValidationOpsSnapshot } from "@/lib/validation/validationSnapshot";
import type {
  LiveValidationResult,
  ValidationLabSnapshot,
  ValidationMetricsRow,
  ValidationSnapshotRow,
} from "@/types/validation";

export interface ValidationLiveApiSuccess {
  ok: true;
  snapshot: ValidationOpsSnapshot | null;
  lab: ValidationLabSnapshot | null;
  live: LiveValidationResult[];
  metricsRows: ValidationMetricsRow[];
  latestSnapshotRow: ValidationSnapshotRow | null;
  meta: {
    fetchedAt: string;
    responseTimeMs: number;
    metricsCount: number;
  };
}

export interface ValidationLiveApiError {
  ok: false;
  error: { message: string };
}

export type ValidationLiveApiResponse =
  | ValidationLiveApiSuccess
  | ValidationLiveApiError;
