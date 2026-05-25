import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getSupabaseProjectUrl } from "@/lib/supabase/client";
import { applyAllSchemas, OPERATIONAL_SCHEMA_FILES } from "@/lib/system/applyAllSchemas";

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

/**
 * POST /api/dev/apply-schema — aplica SQL idempotente (bootstrap projeto/SportMonks).
 */
export async function POST(request: Request) {
  const projectUrl = getSupabaseProjectUrl();
  if (!isSportmonksBootstrap(request) && !isProjectBootstrap(request, projectUrl)) {
    return NextResponse.json({ ok: false, error: "Bootstrap inválido." }, { status: 403 });
  }

  const result = await applyAllSchemas(OPERATIONAL_SCHEMA_FILES);
  const fatal =
    !result.databaseUrlConfigured || result.connectError !== null || result.schemaDir === null;
  return NextResponse.json(
    {
      success: result.success,
      ok: result.ok,
      applied: result.applied,
      skipped: result.skipped,
      failed: result.failed,
      errors: result.errors,
      schemaDir: result.schemaDir,
      schemas: OPERATIONAL_SCHEMA_FILES,
    },
    { status: fatal ? 500 : 200 }
  );
}
