/** Remove comentários de linha (-- ...) para não enviar blocos vazios ao Postgres. */
export function stripSqlComments(sql: string): string {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
}

/**
 * Divide SQL em statements respeitando blocos $$...$$ (funções PL/pgSQL).
 */
export function splitSqlStatements(sql: string): string[] {
  const cleaned = stripSqlComments(sql);
  const statements: string[] = [];
  let buffer = "";
  let i = 0;
  let dollarDelimiter: string | null = null;

  while (i < cleaned.length) {
    if (dollarDelimiter) {
      const end = cleaned.indexOf(dollarDelimiter, i);
      if (end === -1) {
        buffer += cleaned.slice(i);
        break;
      }
      buffer += cleaned.slice(i, end + dollarDelimiter.length);
      i = end + dollarDelimiter.length;
      dollarDelimiter = null;
      continue;
    }

    if (cleaned[i] === "$") {
      const match = cleaned.slice(i).match(/^\$([A-Za-z0-9_]*)\$/);
      if (match) {
        dollarDelimiter = match[0];
        buffer += match[0];
        i += match[0].length;
        continue;
      }
    }

    if (cleaned[i] === ";") {
      const stmt = buffer.trim();
      if (stmt.length > 0) statements.push(stmt);
      buffer = "";
      i += 1;
      continue;
    }

    buffer += cleaned[i];
    i += 1;
  }

  const tail = buffer.trim();
  if (tail.length > 0) statements.push(tail);
  return statements;
}

export type PgErrorClass = "skip" | "fail";

export function classifyPgError(error: unknown): PgErrorClass {
  if (!error || typeof error !== "object") return "fail";
  const e = error as { code?: string; message?: string };
  const code = e.code ?? "";
  const msg = e.message ?? "";

  const skipCodes = new Set([
    "42P07", // duplicate_table
    "42710", // duplicate_object
    "42P06", // duplicate_schema
    "42701", // duplicate_column
    "42P04", // duplicate_database
  ]);
  if (skipCodes.has(code)) return "skip";

  if (/already exists/i.test(msg)) return "skip";
  if (/duplicate key value/i.test(msg)) return "skip";

  // Supabase pooler / role sem acesso ao schema auth — não abortar pipeline inteiro
  if (/permission denied/i.test(msg) && /auth\./i.test(msg)) return "skip";
  if (/must be owner of|permission denied for schema auth/i.test(msg)) return "skip";

  return "fail";
}

export function pgErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code: string }).code);
  }
  return undefined;
}

export function pgErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: string }).message);
  }
  return String(error);
}
