const TAG = "[SCHEMA_APPLY_ERROR]";

export type SchemaApplyLogContext = {
  scope: string;
  file?: string;
  statementIndex?: number;
  code?: string;
  extra?: Record<string, unknown>;
};

function normalizeError(error: unknown): { message: string; stack?: string; code?: string } {
  if (error && typeof error === "object") {
    const e = error as { message?: string; stack?: string; code?: string };
    return {
      message: e.message ?? String(error),
      stack: e.stack,
      code: e.code,
    };
  }
  return { message: String(error) };
}

export function logSchemaApplyError(
  error: unknown,
  context: SchemaApplyLogContext
): void {
  const normalized = normalizeError(error);
  const payload = {
    tag: TAG,
    ...context,
    message: normalized.message,
    code: context.code ?? normalized.code,
    stack: normalized.stack,
    at: new Date().toISOString(),
  };
  console.error(TAG, payload);
}

export function logSchemaApplyInfo(message: string, extra?: Record<string, unknown>): void {
  console.info("[SCHEMA_APPLY]", { message, ...extra, at: new Date().toISOString() });
}
