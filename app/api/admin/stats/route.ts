import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireUser";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { listDevUsers } from "@/lib/auth/devStore";
import { devAuthEnabled } from "@/lib/auth/devStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  if (devAuthEnabled()) {
    const users = listDevUsers();
    const leads = globalThis.__GP_LEADS_DEV__ ?? [];
    const fundadores = users.filter((u) => u.plan === "fundador");
    return NextResponse.json({
      ok: true,
      leadsTotal: leads.length,
      leadsNew: leads.length,
      customersActive: users.length,
      trialsActive: fundadores.length,
      subscriptionsExpired: 0,
      revenueCents: fundadores.reduce((s, u) => s + (u.couponCode ? 1225 : 4900), 0),
      fundadorCount: fundadores.length,
      byPlan: {
        free: users.filter((u) => u.plan === "free").length,
        fundador: fundadores.length,
      },
      mode: "dev",
    });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ ok: true, mode: "empty" });
  }

  const [leadsRes, subsRes, payRes] = await Promise.all([
    db.from("leads").select("id, status", { count: "exact", head: false }),
    db.from("subscriptions").select("plan, status"),
    db.from("payments").select("amount_cents, status").eq("status", "paid"),
  ]);

  const leads = leadsRes.data ?? [];
  const subs = subsRes.data ?? [];
  const payments = payRes.data ?? [];

  return NextResponse.json({
    ok: true,
    leadsTotal: leads.length,
    leadsNew: leads.filter((l) => l.status === "new").length,
    customersActive: subs.filter((s) => s.status === "active").length,
    trialsActive: subs.filter((s) => s.status === "trialing").length,
    subscriptionsExpired: subs.filter((s) => s.status === "past_due").length,
    revenueCents: payments.reduce((s, p) => s + (p.amount_cents ?? 0), 0),
    fundadorCount: subs.filter((s) => s.plan === "fundador").length,
    byPlan: {
      free: subs.filter((s) => s.plan === "free").length,
      fundador: subs.filter((s) => s.plan === "fundador").length,
      pro: subs.filter((s) => s.plan === "pro").length,
      elite: subs.filter((s) => s.plan === "elite").length,
    },
  });
}
