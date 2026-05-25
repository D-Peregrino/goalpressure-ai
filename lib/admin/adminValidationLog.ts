const TAG = "[ADMIN_VALIDATION_ERROR]";

export type AdminValidationLogContext = {
  scope: string;
  component?: string;
  route?: string;
  status?: number;
  extra?: Record<string, unknown>;
};

function normalizeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  if (typeof error === "string") return { message: error };
  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: String(error) };
  }
}

/** Logging estruturado para validação admin (console + window em dev). */
export function logAdminValidationError(
  error: unknown,
  context: AdminValidationLogContext
): void {
  const normalized = normalizeError(error);
  const payload = {
    tag: TAG,
    ...context,
    message: normalized.message,
    stack: normalized.stack,
    at: new Date().toISOString(),
  };

  console.error(TAG, payload);

  if (typeof window !== "undefined") {
    const w = window as Window & { __GP_ADMIN_VALIDATION_ERRORS__?: unknown[] };
    if (!w.__GP_ADMIN_VALIDATION_ERRORS__) w.__GP_ADMIN_VALIDATION_ERRORS__ = [];
    w.__GP_ADMIN_VALIDATION_ERRORS__.push(payload);
  }
}
