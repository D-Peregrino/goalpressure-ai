import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type { DbPlan } from "@/lib/subscription/permissions";

export interface LeadInput {
  name?: string;
  email: string;
  phone?: string;
  source: string;
  interest?: string;
  message?: string;
  couponCode?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export async function insertLead(input: LeadInput): Promise<{ ok: boolean; id?: string }> {
  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) return { ok: false };

  const { data, error } = await admin
    .from("leads")
    .insert({
      name: input.name ?? null,
      email: input.email.trim().toLowerCase(),
      phone: input.phone ?? null,
      source: input.source,
      interest: input.interest ?? null,
      message: input.message ?? null,
      coupon_code: input.couponCode ?? null,
      utm_source: input.utmSource ?? null,
      utm_medium: input.utmMedium ?? null,
      utm_campaign: input.utmCampaign ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false };
  return { ok: true, id: data.id };
}

export async function fetchSubscriptionForUser(userId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data } = await admin
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function activateFundadorSubscription(input: {
  userId: string;
  couponCode?: string | null;
  originalCents: number;
  discountPercent: number;
  finalCents: number;
  provider?: string;
  providerPaymentId?: string;
}) {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { data: existing } = await admin
    .from("subscriptions")
    .select("id")
    .eq("user_id", input.userId)
    .maybeSingle();

  const row = {
    user_id: input.userId,
    plan: "fundador" as DbPlan,
    status: "active",
    provider: input.provider ?? "mock",
    coupon_code: input.couponCode ?? null,
    original_amount_cents: input.originalCents,
    discount_percent: input.discountPercent,
    final_amount_cents: input.finalCents,
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    updated_at: now.toISOString(),
  };

  const { data, error } = existing
    ? await admin.from("subscriptions").update(row).eq("user_id", input.userId).select().single()
    : await admin.from("subscriptions").insert(row).select().single();

  if (error) return null;

  await admin.from("payments").insert({
    user_id: input.userId,
    subscription_id: data.id,
    provider: input.provider ?? "mock",
    provider_payment_id: input.providerPaymentId ?? `mock_${Date.now()}`,
    amount_cents: input.finalCents,
    original_amount_cents: input.originalCents,
    discount_percent: input.discountPercent,
    currency: "BRL",
    status: "paid",
    coupon_code: input.couponCode ?? null,
    paid_at: now.toISOString(),
  });

  await admin.from("customer_events").insert({
    user_id: input.userId,
    type: "subscription_activated",
    description: "Plano Fundador ativado",
    metadata: {
      coupon: input.couponCode,
      final_cents: input.finalCents,
    },
  });

  return data;
}
