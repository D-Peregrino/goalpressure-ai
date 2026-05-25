import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireUser";
import { isSeedEnabled } from "@/lib/seed/config";
import { runOperationalSeed } from "@/lib/seed/runSeed";

export const dynamic = "force-dynamic";

function isSportmonksBootstrap(request: Request): boolean {
  const bootstrap = request.headers.get("x-gp-sportmonks-bootstrap")?.trim();
  const expected = process.env.SPORTMONKS_API_TOKEN?.trim();
  return Boolean(expected && bootstrap === expected);
}

function canRunSeed(request: Request): boolean {
  if (isSeedEnabled()) return true;
  return isSportmonksBootstrap(request);
}

async function authorizeSeed(request: Request): Promise<boolean> {
  if (isSportmonksBootstrap(request)) return true;
  return Boolean(await requireAdmin(request));
}

/**
 * POST /api/dev/seed — popula dados operacionais (admin + GP_ALLOW_SEED ou bootstrap SportMonks).
 * Body opcional: { "clear": true }
 */
export async function POST(request: Request) {
  if (!canRunSeed(request)) {
    return NextResponse.json(
      { ok: false, error: "Seed desabilitado em produção (use GP_ALLOW_SEED=true)." },
      { status: 403 }
    );
  }

  if (!(await authorizeSeed(request))) {
    return NextResponse.json({ ok: false, error: "Acesso negado." }, { status: 403 });
  }

  let clear = false;
  try {
    const body = (await request.json()) as { clear?: boolean };
    clear = Boolean(body.clear);
  } catch {
    /* body vazio */
  }

  const result = await runOperationalSeed({ clear });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, hint: "Rode supabase/operational-seed-schema.sql" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    counts: result.counts,
    hint: "Defina GP_SEED_LIVE=true e reinicie o servidor para o terminal usar os jogos seed.",
  });
}

export async function DELETE(request: Request) {
  if (!canRunSeed(request)) {
    return NextResponse.json({ ok: false, error: "Seed desabilitado." }, { status: 403 });
  }

  if (!(await authorizeSeed(request))) {
    return NextResponse.json({ ok: false, error: "Acesso negado." }, { status: 403 });
  }

  const { clearSeedData } = await import("@/lib/seed/runSeed");
  const { getSupabaseAdmin } = await import("@/lib/supabase/client");
  const client = getSupabaseAdmin();
  if (!client) {
    return NextResponse.json({ ok: false, error: "Supabase não configurado." }, { status: 503 });
  }

  const result = await clearSeedData(client);
  return NextResponse.json(result);
}
