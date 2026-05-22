import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireUser";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { devAuthEnabled, findDevUserById } from "@/lib/auth/devStore";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId obrigatório." }, { status: 400 });
  }

  if (devAuthEnabled()) {
    const u = findDevUserById(userId);
    if (!u) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    return NextResponse.json({
      ok: true,
      customer: {
        user_id: u.id,
        name: u.name,
        email: u.email,
        plan: u.plan,
        subscription_status: u.subscriptionStatus,
      },
      events: [
        {
          id: "ev_dev",
          type: "dev_account",
          description: "Conta de desenvolvimento",
          created_at: u.createdAt,
        },
      ],
      notes: [],
      mode: "dev",
    });
  }

  const db = getSupabaseAdmin();
  if (!db || !isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, events: [], notes: [] });
  }

  const [profileRes, subRes, eventsRes, notesRes] = await Promise.all([
    db.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    db.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
    db
      .from("customer_events")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("support_notes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return NextResponse.json({
    ok: true,
    customer: {
      ...profileRes.data,
      plan: subRes.data?.plan ?? "free",
      subscription_status: subRes.data?.status ?? "active",
      subscription: subRes.data,
    },
    events: eventsRes.data ?? [],
    notes: notesRes.data ?? [],
  });
}
