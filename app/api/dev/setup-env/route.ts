import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getSupabaseProjectUrl } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

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
 * GET /api/dev/setup-env
 * Exporta URL + service role para setup local (bootstrap projeto ou SportMonks).
 * Não expõe ANON_KEY — use apenas em ambiente controlado.
 */
export async function GET(request: Request) {
  const projectUrl = getSupabaseProjectUrl();
  if (!isSportmonksBootstrap(request) && !isProjectBootstrap(request, projectUrl)) {
    return NextResponse.json({ ok: false, error: "Bootstrap inválido." }, { status: 403 });
  }

  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

  const validKey =
    serviceRoleKey.startsWith("sb_secret_") || serviceRoleKey.startsWith("eyJ");

  if (!url || !validKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase incompleto no servidor.",
        hasUrl: Boolean(url),
        hasServiceRole: validKey,
        keyPrefix: serviceRoleKey.slice(0, 10) || null,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    url,
    serviceRoleKey,
    projectRef: url.replace("https://", "").split(".")[0] ?? null,
    databaseUrl:
      process.env.DATABASE_URL?.trim() ||
      process.env.POSTGRES_URL?.trim() ||
      process.env.SUPABASE_DB_URL?.trim() ||
      process.env.DIRECT_URL?.trim() ||
      null,
  });
}
