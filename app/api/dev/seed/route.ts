import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireUser";
import { isSeedEnabled } from "@/lib/seed/config";
import { runOperationalSeed } from "@/lib/seed/runSeed";

export const dynamic = "force-dynamic";

/**
 * POST /api/dev/seed — popula dados operacionais (admin + GP_ALLOW_SEED).
 * Body opcional: { "clear": true }
 */
export async function POST(request: Request) {
  if (!isSeedEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Seed desabilitado em produção (use GP_ALLOW_SEED=true)." },
      { status: 403 }
    );
  }

  const admin = await requireAdmin(request);
  if (!admin) {
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
  if (!isSeedEnabled()) {
    return NextResponse.json({ ok: false, error: "Seed desabilitado." }, { status: 403 });
  }

  const admin = await requireAdmin(request);
  if (!admin) {
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
