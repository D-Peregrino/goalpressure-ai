/**
 * Snapshot in-memory do Validation Lab — globalThis.__GP_VALIDATION__.
 */

import type {
  LiveValidationResult,
  ValidationLabSnapshot,
} from "@/types/validation";

export interface ValidationOpsSnapshot {
  updatedAt: string;
  matchCount: number;
  averageValidationScore: number;
  highReliabilityCount: number;
  flaggedCount: number;
  lab: ValidationLabSnapshot;
  live: LiveValidationResult[];
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_VALIDATION__: ValidationOpsSnapshot | undefined;
}

export function setValidationOpsSnapshot(
  lab: ValidationLabSnapshot,
  live: LiveValidationResult[]
): ValidationOpsSnapshot {
  const n = live.length;
  const averageValidationScore =
    n > 0
      ? Math.round(live.reduce((s, r) => s + r.validationScore, 0) / n)
      : 0;

  const snapshot: ValidationOpsSnapshot = {
    updatedAt: new Date().toISOString(),
    matchCount: n,
    averageValidationScore,
    highReliabilityCount: live.filter((r) => r.reliability === "HIGH").length,
    flaggedCount: live.filter((r) => r.flags.length > 0).length,
    lab,
    live,
  };

  globalThis.__GP_VALIDATION__ = snapshot;
  return snapshot;
}

export function getValidationOpsSnapshot(): ValidationOpsSnapshot | null {
  return globalThis.__GP_VALIDATION__ ?? null;
}
