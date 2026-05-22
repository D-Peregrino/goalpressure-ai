import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireUser";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";


export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  if (isSupabaseConfigured()) {
    const db = getSupabaseAdmin();
    if (db) {
      const { data, error } = await db
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, leads: data });
    }
  }

  return NextResponse.json({ ok: true, leads: globalThis.__GP_LEADS_DEV__ ?? [] });
}

export async function PATCH(request: Request) {
  const adminUser = await requireAdmin();
  if (!adminUser) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const body = (await request.json()) as { id?: string; status?: string; notes?: string };
  if (!body.id) {
    return NextResponse.json({ error: "ID obrigatório." }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db || !isSupabaseConfigured()) {
    const store = globalThis.__GP_LEADS_DEV__ ?? [];
    const idx = store.findIndex((l) => (l as { id?: string }).id === body.id);
    if (idx >= 0) {
      const row = store[idx] as { status?: string; notes?: string };
      if (body.status) row.status = body.status;
      if (body.notes) row.notes = body.notes;
    }
    return NextResponse.json({ ok: true, mode: "dev" });
  }

  const { error } = await db
    .from("leads")
    .update({
      status: body.status,
      notes: body.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
