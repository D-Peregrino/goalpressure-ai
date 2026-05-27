import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type { PlanSlug } from "@/lib/billing/planSlugs";
import { planSlugToLegacyDbPlan } from "@/lib/billing/planSlugs";
import { subscriptionActive } from "@/lib/subscription/permissions";

export interface UserSubscriptionRow {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan_slug: PlanSlug;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  coupon_code: string | null;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionInvoiceRow {
  id: string;
  user_id: string;
  stripe_invoice_id: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_USER_SUBS_DEV__: Map<string, UserSubscriptionRow> | undefined;
}

function devMap(): Map<string, UserSubscriptionRow> {
  if (!globalThis.__GP_USER_SUBS_DEV__) {
    globalThis.__GP_USER_SUBS_DEV__ = new Map();
  }
  return globalThis.__GP_USER_SUBS_DEV__;
}

export async function fetchUserSubscription(
  userId: string
): Promise<UserSubscriptionRow | null> {
  const admin = getSupabaseAdmin();
  if (admin && isSupabaseConfigured()) {
    const { data } = await admin
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return (data as UserSubscriptionRow | null) ?? null;
  }
  return devMap().get(userId) ?? null;
}

export async function upsertUserSubscription(input: {
  userId: string;
  planSlug: PlanSlug;
  status: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  couponCode?: string | null;
  trialEndsAt?: Date | null;
}): Promise<UserSubscriptionRow | null> {
  const now = new Date().toISOString();
  const row = {
    user_id: input.userId,
    plan_slug: input.planSlug,
    status: input.status,
    stripe_customer_id: input.stripeCustomerId ?? null,
    stripe_subscription_id: input.stripeSubscriptionId ?? null,
    current_period_end: input.currentPeriodEnd?.toISOString() ?? null,
    cancel_at_period_end: input.cancelAtPeriodEnd ?? false,
    coupon_code: input.couponCode ?? null,
    trial_ends_at: input.trialEndsAt?.toISOString() ?? null,
    updated_at: now,
  };

  const admin = getSupabaseAdmin();
  if (admin && isSupabaseConfigured()) {
    const { data, error } = await admin
      .from("user_subscriptions")
      .upsert(row, { onConflict: "user_id" })
      .select("*")
      .single();
    if (error) return null;
    await syncLegacySubscription(input.userId, data as UserSubscriptionRow);
    return data as UserSubscriptionRow;
  }

  const existing = devMap().get(input.userId);
  const merged: UserSubscriptionRow = {
    id: existing?.id ?? `usub_${Date.now()}`,
    created_at: existing?.created_at ?? now,
    ...row,
    plan_slug: input.planSlug,
    cancel_at_period_end: row.cancel_at_period_end,
    coupon_code: row.coupon_code,
    trial_ends_at: row.trial_ends_at,
    stripe_customer_id: row.stripe_customer_id,
    stripe_subscription_id: row.stripe_subscription_id,
    current_period_end: row.current_period_end,
  } as UserSubscriptionRow;
  devMap().set(input.userId, merged);
  return merged;
}

/** Mantém tabela legada subscriptions em sync para rotas antigas. */
async function syncLegacySubscription(
  userId: string,
  sub: UserSubscriptionRow
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const legacyPlan = planSlugToLegacyDbPlan(sub.plan_slug);
  await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      plan: legacyPlan,
      status: sub.status,
      provider: "stripe",
      provider_customer_id: sub.stripe_customer_id,
      provider_subscription_id: sub.stripe_subscription_id,
      coupon_code: sub.coupon_code,
      current_period_end: sub.current_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

export async function recordSubscriptionInvoice(input: {
  userId: string;
  userSubscriptionId?: string;
  stripeInvoiceId: string;
  amountCents: number;
  currency: string;
  status: string;
  paidAt?: Date | null;
}): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) return;

  await admin.from("subscription_invoices").upsert(
    {
      user_id: input.userId,
      user_subscription_id: input.userSubscriptionId ?? null,
      stripe_invoice_id: input.stripeInvoiceId,
      amount_cents: input.amountCents,
      currency: input.currency,
      status: input.status,
      paid_at: input.paidAt?.toISOString() ?? null,
    },
    { onConflict: "stripe_invoice_id" }
  );
}

export async function fetchSubscriptionInvoices(
  userId: string,
  limit = 24
): Promise<SubscriptionInvoiceRow[]> {
  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) return [];

  const { data } = await admin
    .from("subscription_invoices")
    .select("id, user_id, stripe_invoice_id, amount_cents, currency, status, paid_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as SubscriptionInvoiceRow[];
}

export async function userHadPaidSubscriptionBefore(userId: string): Promise<boolean> {
  const sub = await fetchUserSubscription(userId);
  if (!sub) return false;
  return sub.plan_slug !== "free" && Boolean(sub.stripe_subscription_id);
}

export function resolveEffectivePlanSlug(
  sub: UserSubscriptionRow | null,
  legacyPlan?: string
): PlanSlug {
  if (sub && subscriptionActive(sub.status) && sub.plan_slug !== "free") {
    return sub.plan_slug;
  }
  if (legacyPlan === "fundador") return "founder";
  if (legacyPlan === "starter") return "starter";
  if (legacyPlan === "pro") return "pro";
  if (legacyPlan === "elite" || legacyPlan === "ops") return "founder";
  return "free";
}
