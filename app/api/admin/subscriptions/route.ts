import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireUser";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { devAuthEnabled, listDevUsers } from "@/lib/auth/devStore";
import { updateSubscriptionAdmin } from "@/lib/commercial/db";
import type { DbPlan } from "@/lib/subscription/permissions";

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
    .select("*, profiles(name,email)")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = (data ?? [])
    .map((s) => (s as { user_id?: string }).user_id)
    .filter(Boolean) as string[];
  const { data: payments } = userIds.length
    ? await db
        .from("payments")
        .select("*")
        .in("user_id", userIds)
        .order("created_at", { ascending: false })
        .limit(800)
    : { data: [] as any[] };

  const lastByUser = new Map<string, any>();
  for (const p of payments ?? []) {
    const uid = String((p as any).user_id ?? "");
    if (!uid || lastByUser.has(uid)) continue;
    lastByUser.set(uid, p);
  }

  const out = (data ?? []).map((s: any) => ({
    ...s,
    name: s.profiles?.name ?? null,
    email: s.profiles?.email ?? null,
    lastPayment: lastByUser.get(String(s.user_id)) ?? null,
  }));

  return NextResponse.json({ ok: true, subscriptions: out });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const body = (await request.json()) as {
    userId?: string;
    plan?: DbPlan;
    status?: "trialing" | "active" | "past_due" | "canceled" | "incomplete";
    periodEndMonths?: number;
  };

  if (!body.userId || !body.plan || !body.status) {
    return NextResponse.json(
      { error: "userId, plan e status são obrigatórios." },
      { status: 400 }
    );
  }

  const res = await updateSubscriptionAdmin({
    userId: body.userId,
    plan: body.plan,
    status: body.status,
    provider: "manual",
    periodEndMonths: body.periodEndMonths,
    adminId: admin.id,
    adminEmail: admin.email,
  });

  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
