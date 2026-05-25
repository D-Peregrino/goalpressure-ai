import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/dev/setup-env
 * Exporta URL + service role para setup local (somente com bootstrap SportMonks).
 * Não expõe ANON_KEY — use apenas em ambiente controlado.
 */
export async function GET(request: Request) {
  const bootstrap = request.headers.get("x-gp-sportmonks-bootstrap")?.trim();
  const expected = process.env.SPORTMONKS_API_TOKEN?.trim();

  if (!expected || !bootstrap || bootstrap !== expected) {
    return NextResponse.json({ ok: false, error: "Bootstrap inválido." }, { status: 403 });
  }

  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

  if (!url || !serviceRoleKey.startsWith("sb_secret_")) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase incompleto no servidor.",
        hasUrl: Boolean(url),
        hasServiceRole: serviceRoleKey.startsWith("sb_secret_"),
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    url,
    serviceRoleKey,
    projectRef: url.replace("https://", "").split(".")[0] ?? null,
  });
}
