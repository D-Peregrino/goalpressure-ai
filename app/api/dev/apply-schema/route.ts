import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";
import { getSupabaseProjectUrl } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SETUP_SALT = "goalpressure-setup-v1";

function isProjectBootstrap(request: Request, projectUrl: string): boolean {
  const key = request.headers.get("x-gp-project-bootstrap")?.trim();
  if (!key || !projectUrl) return false;
  const expected = createHash("sha256").update(projectUrl + SETUP_SALT).digest("hex").slice(0, 32);
  return key === expected;
}

function isSportmonksBootstrap(request: Request): boolean {
  const bootstrap = request.headers.get("x-gp-sportmonks-bootstrap")?.trim();
  const expected = process.env.SPORTMONKS_API_TOKEN?.trim();
  return Boolean(expected && bootstrap === expected);
}

const SCHEMA_FILES = [
  "operational-seed-schema.sql",
  "live-runtime-schema.sql",
  "live-pressure-snapshots-schema.sql",
  "live-ev-signals-schema.sql",
  "operational-insights-schema.sql",
  "learning-layer-schema.sql",
  "commercial-schema.sql",
];

/**
 * POST /api/dev/apply-schema — aplica SQL idempotente (bootstrap projeto/SportMonks).
 */
export async function POST(request: Request) {
  const projectUrl = getSupabaseProjectUrl();
  if (!isSportmonksBootstrap(request) && !isProjectBootstrap(request, projectUrl)) {
    return NextResponse.json({ ok: false, error: "Bootstrap inválido." }, { status: 403 });
  }

  const dbUrl =
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.SUPABASE_DB_URL?.trim() ||
    process.env.DIRECT_URL?.trim();
  if (!dbUrl) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL não configurada no servidor." },
      { status: 503 }
    );
  }

  let pg: typeof import("pg");
  try {
    pg = await import("pg");
  } catch {
    return NextResponse.json(
      { ok: false, error: "Pacote pg não instalado. Rode npm install pg." },
      { status: 500 }
    );
  }

  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  const applied: string[] = [];
  const errors: string[] = [];

  try {
    await client.connect();
    const base = join(process.cwd(), "supabase");

    for (const file of SCHEMA_FILES) {
      const path = join(base, file);
      try {
        const sql = readFileSync(path, "utf8");
        await client.query(sql);
        applied.push(file);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${file}: ${msg}`);
      }
    }
  } finally {
    await client.end().catch(() => {});
  }

  return NextResponse.json({
    ok: errors.length === 0,
    applied,
    errors,
  });
}
