import { existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  classifyPgError,
  pgErrorCode,
  pgErrorMessage,
  splitSqlStatements,
} from "@/lib/system/schemaSql";
import { logSchemaApplyError, logSchemaApplyInfo } from "@/lib/system/schemaApplyLog";

export const OPERATIONAL_SCHEMA_FILES = [
  "operational-seed-schema.sql",
  "live-runtime-schema.sql",
  "live-pressure-snapshots-schema.sql",
  "live-ev-signals-schema.sql",
  "operational-insights-schema.sql",
  "learning-layer-schema.sql",
  "live-signal-dispatches-schema.sql",
  "autonomous-decisions-schema.sql",
  "historical-contextual-persistence-schema.sql",
  "commercial-schema.sql",
  "telegram-destinations-schema.sql",
  "billing-mercadopago-schema.sql",
  "copa-leads-schema.sql",
] as const;

export interface SchemaApplyFailure {
  file: string;
  statement?: number;
  error: string;
  code?: string;
}

export interface SchemaApplySkipped {
  file: string;
  statement?: number;
  reason: string;
  code?: string;
}

export interface ApplySchemasResult {
  /** true se conectou e nenhuma falha crítica (pode ter skips). */
  success: boolean;
  /** Compat legado */
  ok: boolean;
  applied: string[];
  skipped: SchemaApplySkipped[];
  failed: SchemaApplyFailure[];
  errors: string[];
  databaseUrlConfigured: boolean;
  schemaDir: string | null;
  connectError: string | null;
}

export function getDatabaseUrl(): string | null {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.SUPABASE_DB_URL?.trim() ||
    process.env.DIRECT_URL?.trim() ||
    null
  );
}

/** Resolve pasta supabase (local, Docker, monorepo). */
export function resolveSupabaseSchemaDir(): string | null {
  const fromEnv = process.env.GP_SCHEMA_DIR?.trim();
  const candidates = [
    fromEnv,
    join(process.cwd(), "supabase"),
    join(process.cwd(), "frontend", "supabase"),
  ].filter((p): p is string => Boolean(p));

  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }
  return null;
}

function maskDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return "(invalid-url)";
  }
}

/**
 * Aplica todos os schemas SQL idempotentes no Postgres — um statement por vez.
 */
export async function applyAllSchemas(
  files: readonly string[] = OPERATIONAL_SCHEMA_FILES
): Promise<ApplySchemasResult> {
  const applied: string[] = [];
  const skipped: SchemaApplySkipped[] = [];
  const failed: SchemaApplyFailure[] = [];
  const errors: string[] = [];

  const dbUrl = getDatabaseUrl();
  if (!dbUrl) {
    const msg = "DATABASE_URL / DIRECT_URL / POSTGRES_URL / SUPABASE_DB_URL não configurada.";
    logSchemaApplyError(new Error(msg), { scope: "config" });
    return {
      success: false,
      ok: false,
      applied,
      skipped,
      failed,
      errors: [msg],
      databaseUrlConfigured: false,
      schemaDir: null,
      connectError: msg,
    };
  }

  const schemaDir = resolveSupabaseSchemaDir();
  if (!schemaDir) {
    const msg = `Pasta supabase não encontrada (cwd=${process.cwd()}).`;
    logSchemaApplyError(new Error(msg), { scope: "schema_dir", extra: { cwd: process.cwd() } });
    return {
      success: false,
      ok: false,
      applied,
      skipped,
      failed,
      errors: [msg],
      databaseUrlConfigured: true,
      schemaDir: null,
      connectError: msg,
    };
  }

  let pg: typeof import("pg");
  try {
    pg = await import("pg");
  } catch (e) {
    const msg = "Pacote pg não instalado.";
    logSchemaApplyError(e, { scope: "pg_import" });
    return {
      success: false,
      ok: false,
      applied,
      skipped,
      failed,
      errors: [msg],
      databaseUrlConfigured: true,
      schemaDir,
      connectError: msg,
    };
  }

  logSchemaApplyInfo("starting", {
    schemaDir,
    files: files.length,
    database: maskDatabaseUrl(dbUrl),
  });

  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });

  let connectError: string | null = null;

  try {
    await client.connect();
  } catch (e) {
    connectError = pgErrorMessage(e);
    logSchemaApplyError(e, { scope: "connect", code: pgErrorCode(e) });
    errors.push(`connect: ${connectError}`);
    return {
      success: false,
      ok: false,
      applied,
      skipped,
      failed,
      errors,
      databaseUrlConfigured: true,
      schemaDir,
      connectError,
    };
  }

  try {
    for (const file of files) {
      const filePath = join(schemaDir, file);
      if (!existsSync(filePath)) {
        const msg = `Arquivo não encontrado: ${filePath}`;
        failed.push({ file, error: msg });
        errors.push(`${file}: ${msg}`);
        logSchemaApplyError(new Error(msg), { scope: "read_file", file });
        continue;
      }

      let sql: string;
      try {
        sql = readFileSync(filePath, "utf8");
      } catch (e) {
        const msg = pgErrorMessage(e);
        failed.push({ file, error: msg });
        errors.push(`${file}: ${msg}`);
        logSchemaApplyError(e, { scope: "read_file", file });
        continue;
      }

      const statements = splitSqlStatements(sql);
      if (statements.length === 0) {
        skipped.push({ file, reason: "arquivo_vazio_ou_so_comentarios" });
        continue;
      }

      let fileHadFailure = false;
      let fileHadSuccess = false;

      for (let idx = 0; idx < statements.length; idx++) {
        const statement = statements[idx];
        try {
          await client.query(statement);
          fileHadSuccess = true;
        } catch (e) {
          const classification = classifyPgError(e);
          const code = pgErrorCode(e);
          const msg = pgErrorMessage(e);

          if (classification === "skip") {
            skipped.push({
              file,
              statement: idx + 1,
              reason: msg,
              code,
            });
            logSchemaApplyInfo("skipped", { file, statement: idx + 1, code, message: msg });
            continue;
          }

          fileHadFailure = true;
          failed.push({
            file,
            statement: idx + 1,
            error: msg,
            code,
          });
          errors.push(`${file}#${idx + 1}: ${msg}`);
          logSchemaApplyError(e, {
            scope: "statement",
            file,
            statementIndex: idx + 1,
            code,
          });
        }
      }

      if (fileHadFailure && !fileHadSuccess) {
        /* arquivo inteiro falhou */
      } else if (!fileHadFailure) {
        applied.push(file);
      } else if (fileHadSuccess) {
        applied.push(`${file} (parcial)`);
      }
    }
  } catch (e) {
    const msg = pgErrorMessage(e);
    connectError = msg;
    errors.push(`runtime: ${msg}`);
    logSchemaApplyError(e, { scope: "runtime", code: pgErrorCode(e) });
  } finally {
    await client.end().catch(() => {});
  }

  const ok = connectError === null && failed.length === 0;
  const success = connectError === null && applied.length > 0;

  logSchemaApplyInfo("finished", {
    success,
    ok,
    applied: applied.length,
    skipped: skipped.length,
    failed: failed.length,
  });

  return {
    success,
    ok,
    applied,
    skipped,
    failed,
    errors,
    databaseUrlConfigured: true,
    schemaDir,
    connectError,
  };
}
