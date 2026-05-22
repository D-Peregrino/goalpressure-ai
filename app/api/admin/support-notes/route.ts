import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireUser";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const body = (await request.json()) as { userId?: string; note?: string };
  if (!body.userId || !body.note?.trim()) {
    return NextResponse.json({ error: "userId e nota são obrigatórios." }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db || !isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, mode: "dev", message: "Nota registrada (modo dev)." });
  }

  const { error } = await db.from("support_notes").insert({
    user_id: body.userId,
    admin_id: admin.id,
    note: body.note.trim(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("customer_events").insert({
    user_id: body.userId,
    type: "support_note",
    description: "Nota interna adicionada",
    metadata: { admin_id: admin.id },
  });

  return NextResponse.json({ ok: true });
}
