import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  fetchSubscriptionInvoices,
  fetchUserSubscription,
} from "@/lib/billing/userSubscriptionStore";
import { OFFICIAL_PLANS } from "@/lib/billing/planSlugs";
import type { PlanSlug } from "@/lib/billing/planSlugs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  }

  const userSub = await fetchUserSubscription(user.id);
  const invoices = await fetchSubscriptionInvoices(user.id);

  const db = getSupabaseAdmin();
  let legacySubscription = null;
  let lastPayment = null;

  if (db && isSupabaseConfigured()) {
    const { data: subscription } = await db
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    legacySubscription = subscription;

    const { data: payment } = await db
      .from("payments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    lastPayment = payment;
  }

  const planSlug = (userSub?.plan_slug ?? "free") as PlanSlug;
  const planMeta = OFFICIAL_PLANS[planSlug] ?? OFFICIAL_PLANS.free;

  return NextResponse.json({
    ok: true,
    subscription: userSub ?? legacySubscription,
    legacySubscription,
    lastPayment,
    invoices,
    plan: {
      slug: planSlug,
      name: planMeta.name,
      monthlyPriceCents: planMeta.monthlyPriceCents,
      features: planMeta.features,
    },
    stripeCustomerId: userSub?.stripe_customer_id ?? null,
    cancelAtPeriodEnd: userSub?.cancel_at_period_end ?? false,
    currentPeriodEnd: userSub?.current_period_end ?? null,
    trialEndsAt: userSub?.trial_ends_at ?? null,
  });
}
