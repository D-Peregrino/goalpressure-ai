import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireUser";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { devAuthEnabled, listDevUsers } from "@/lib/auth/devStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  if (devAuthEnabled()) {
    const customers = listDevUsers().map((u) => ({
      id: u.id,
      user_id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      plan: u.plan,
      subscription_status: u.subscriptionStatus,
      coupon_code: u.couponCode,
      created_at: u.createdAt,
    }));
    return NextResponse.json({ ok: true, customers, mode: "dev" });
  }

  const db = getSupabaseAdmin();
  if (!db || !isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, customers: [] });
  }

  const { data: profiles, error: pErr } = await db
    .from("profiles")
    .select("id, user_id, name, email, phone, role, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const userIds = (profiles ?? []).map((p) => p.user_id).filter(Boolean);
  const { data: subs } = userIds.length
    ? await db.from("subscriptions").select("user_id, plan, status, coupon_code, current_period_end").in("user_id", userIds)
    : { data: [] };

  const subByUser = new Map((subs ?? []).map((s) => [s.user_id, s]));

  const customers = (profiles ?? []).map((p) => {
    const sub = subByUser.get(p.user_id);
    return {
      ...p,
      plan: sub?.plan ?? "free",
      subscription_status: sub?.status ?? "active",
      coupon_code: sub?.coupon_code ?? null,
      current_period_end: sub?.current_period_end ?? null,
    };
  });

  return NextResponse.json({ ok: true, customers });
}
