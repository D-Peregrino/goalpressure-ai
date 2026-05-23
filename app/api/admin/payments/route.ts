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
    const payments = listDevUsers()
      .filter((u) => u.plan === "fundador")
      .map((u) => ({
        id: `pay_${u.id}`,
        user_id: u.id,
        provider: "mock",
        amount_cents: u.couponCode ? 1225 : 4900,
        currency: "BRL",
        status: "paid",
        coupon_code: u.couponCode,
        paid_at: u.createdAt,
        created_at: u.createdAt,
        email: u.email,
      }));
    return NextResponse.json({ ok: true, payments, mode: "dev" });
  }

  const db = getSupabaseAdmin();
  if (!db || !isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, payments: [] });
  }

  const { data, error } = await db
    .from("payments")
    .select("*, profiles:profiles!payments_user_id_fkey(email)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    const { data: plain, error: e2 } = await db
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
    return NextResponse.json({ ok: true, payments: plain ?? [] });
  }

  return NextResponse.json({ ok: true, payments: data ?? [] });
}
