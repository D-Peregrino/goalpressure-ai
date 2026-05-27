import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireUser";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { OFFICIAL_PLANS } from "@/lib/billing/planSlugs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  if (!db || !isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      mode: "dev",
      mrrCents: 0,
      activeSubscribers: 0,
      trialing: 0,
      canceled: 0,
      upgrades: 0,
      copaLeads: 0,
      byPlan: {},
    });
  }

  const { data: subs } = await db.from("user_subscriptions").select("*");
  const rows = subs ?? [];

  const active = rows.filter((s) => s.status === "active");
  const trialing = rows.filter((s) => s.status === "trialing");
  const canceled = rows.filter((s) => s.status === "canceled");

  let mrrCents = 0;
  const byPlan: Record<string, number> = {};
  for (const s of active) {
    const slug = String(s.plan_slug ?? "free");
    byPlan[slug] = (byPlan[slug] ?? 0) + 1;
    const plan = OFFICIAL_PLANS[slug as keyof typeof OFFICIAL_PLANS];
    if (plan) mrrCents += plan.monthlyPriceCents;
  }

  const { count: copaLeads } = await db
    .from("copa_leads")
    .select("id", { count: "exact", head: true });

  const copaTotal = copaLeads ?? 0;
  const conversionRate =
    copaTotal > 0 ? Math.round((active.length / copaTotal) * 100) : 0;

  return NextResponse.json({
    ok: true,
    mrrCents,
    mrrLabel: (mrrCents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    }),
    activeSubscribers: active.length,
    trialing: trialing.length,
    canceled: canceled.length,
    upgrades: trialing.length + active.length,
    copaLeads: copaTotal,
    copaConversionPct: conversionRate,
    byPlan,
    totalSubscriptions: rows.length,
  });
}
