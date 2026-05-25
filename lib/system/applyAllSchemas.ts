import { readFileSync } from "fs";
import { join } from "path";

export const OPERATIONAL_SCHEMA_FILES = [
  "operational-seed-schema.sql",
  "live-runtime-schema.sql",
  "live-pressure-snapshots-schema.sql",
  "live-ev-signals-schema.sql",
  "operational-insights-schema.sql",
  "learning-layer-schema.sql",
  "live-signal-dispatches-schema.sql",
  "autonomous-decisions-schema.sql",
  "commercial-schema.sql",
] as const;

export interface ApplySchemasResult {
  ok: boolean;
  applied: string[];
  errors: string[];
  databaseUrlConfigured: boolean;
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

/**
 * Aplica todos os schemas SQL idempotentes no Postgres.
 */
export async function applyAllSchemas(
  files: readonly string[] = OPERATIONAL_SCHEMA_FILES
): Promise<ApplySchemasResult> {
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) {
    return {
      ok: false,
      applied: [],
      errors: ["DATABASE_URL não configurada no servidor."],
      databaseUrlConfigured: false,
    };
  }

  let pg: typeof import("pg");
  try {
    pg = await import("pg");
  } catch {
    return {
      ok: false,
      applied: [],
      errors: ["Pacote pg não instalado."],
      databaseUrlConfigured: true,
    };
  }

  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  const applied: string[] = [];
  const errors: string[] = [];

  try {
    await client.connect();
    const base = join(process.cwd(), "supabase");

    for (const file of files) {
      const filePath = join(base, file);
      try {
        const sql = readFileSync(filePath, "utf8");
        await client.query(sql);
        applied.push(file);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${file}: ${msg}`);
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`connect: ${msg}`);
  } finally {
    await client.end().catch(() => {});
  }

  return {
    ok: errors.length === 0,
    applied,
    errors,
    databaseUrlConfigured: true,
  };
}
