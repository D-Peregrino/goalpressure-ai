export type AdminAuthLogTag = "[ADMIN_AUTH]" | "[ADMIN_LOGIN]" | "[ADMIN_SESSION]";

export type AdminAuthLogPayload = {
  scope: string;
  message?: string;
  route?: string;
  status?: number;
  extra?: Record<string, unknown>;
};

function normalizeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) return { message: error.message, stack: error.stack };
  if (typeof error === "string") return { message: error };
  return { message: String(error) };
}

export function logAdminAuth(
  tag: AdminAuthLogTag,
  payload: AdminAuthLogPayload,
  error?: unknown
): void {
  const normalized = error ? normalizeError(error) : undefined;
  const entry = {
    tag,
    ...payload,
    ...(normalized ? { error: normalized.message, stack: normalized.stack } : {}),
    at: new Date().toISOString(),
  };
  console.info(tag, entry);
  if (error) console.error(tag, entry);
}
