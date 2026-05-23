import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireUser";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { devAuthEnabled, listDevUsers } from "@/lib/auth/devStore";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  if (devAuthEnabled()) {
    const subscriptions = listDevUsers().map((u) => ({
      id: `sub_${u.id}`,
      user_id: u.id,
      plan: u.plan,
      status: u.subscriptionStatus,
      provider: "mock",
      coupon_code: u.couponCode,
      final_amount_cents: u.plan === "fundador" ? (u.couponCode ? 1225 : 4900) : 0,
      email: u.email,
      name: u.name,
      created_at: u.createdAt,
    }));
    return NextResponse.json({ ok: true, subscriptions, mode: "dev" });
  }

  const db = getSupabaseAdmin();
  if (!db || !isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, subscriptions: [] });
  }

  const { data, error } = await db
    .from("subscriptions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, subscriptions: data ?? [] });
}
