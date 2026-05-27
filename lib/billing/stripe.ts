import Stripe from "stripe";
import {
  OFFICIAL_PLANS,
  type PlanSlug,
  TRIAL_DAYS_STARTER_PRO,
} from "@/lib/billing/planSlugs";
import { aplicarCupom } from "@/lib/subscription/coupons";
import { CUPOM_BARBOSATIPS75 } from "@/lib/subscription/plans";
import { userHadPaidSubscriptionBefore } from "@/lib/billing/userSubscriptionStore";

let stripeClient: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripe(): Stripe {
  if (!stripeConfigured()) {
    throw new Error("STRIPE_SECRET_KEY não configurada.");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!.trim());
  }
  return stripeClient;
}

function resolveStripePriceId(planSlug: PlanSlug, interval: "month" | "year"): string | null {
  const plan = OFFICIAL_PLANS[planSlug];
  const envKey =
    interval === "year" ? plan.stripePriceYearlyEnv : plan.stripePriceMonthlyEnv;
  if (!envKey) return null;
  return process.env[envKey]?.trim() || null;
}

export async function createStripeCheckoutSession(input: {
  userId: string;
  email: string;
  planSlug: PlanSlug;
  interval?: "month" | "year";
  couponCode?: string;
  successUrl: string;
  cancelUrl: string;
  trialEligible?: boolean;
}): Promise<{ url: string; id: string }> {
  const stripe = getStripe();
  const interval = input.interval ?? "month";
  const plan = OFFICIAL_PLANS[input.planSlug];

  if (input.planSlug === "free") {
    throw new Error("Plano gratuito não requer checkout.");
  }

  const priceId = resolveStripePriceId(input.planSlug, interval);
  if (!priceId) {
    throw new Error(
      `Price ID Stripe não configurado para ${input.planSlug} (${interval}). Defina ${plan.stripePriceMonthlyEnv} no .env.`
    );
  }

  const hadPaid = await userHadPaidSubscriptionBefore(input.userId);
  const trialDays =
    input.trialEligible !== false &&
    !hadPaid &&
    (input.planSlug === "starter" || input.planSlug === "pro")
      ? TRIAL_DAYS_STARTER_PRO
      : 0;

  const couponNorm = input.couponCode?.trim().toUpperCase();
  const discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];

  if (couponNorm === CUPOM_BARBOSATIPS75 && input.planSlug === "founder") {
    const stripeCouponId = process.env.STRIPE_COUPON_BARBOSATIPS75?.trim();
    if (stripeCouponId) {
      discounts.push({ coupon: stripeCouponId });
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: input.email,
    client_reference_id: input.userId,
    line_items: [{ price: priceId, quantity: 1 }],
    discounts: discounts.length ? discounts : undefined,
    allow_promotion_codes: discounts.length === 0,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      gp_user_id: input.userId,
      gp_plan_slug: input.planSlug,
      gp_coupon: couponNorm ?? "",
      gp_interval: interval,
    },
    subscription_data: {
      trial_period_days: trialDays > 0 ? trialDays : undefined,
      metadata: {
        gp_user_id: input.userId,
        gp_plan_slug: input.planSlug,
      },
    },
  });

  if (!session.url) {
    throw new Error("Stripe não retornou URL de checkout.");
  }

  return { url: session.url, id: session.id };
}

export async function createStripeBillingPortalSession(input: {
  stripeCustomerId: string;
  returnUrl: string;
}): Promise<string> {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: input.stripeCustomerId,
    return_url: input.returnUrl,
  });
  return session.url;
}

export function constructStripeEvent(
  payload: string,
  signature: string
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET não configurada.");
  }
  return getStripe().webhooks.constructEvent(payload, signature, secret);
}

export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status
): string {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "unpaid":
      return "unpaid";
    case "incomplete":
    case "incomplete_expired":
      return "incomplete";
    default:
      return "inactive";
  }
}

export function planSlugFromStripeMetadata(
  metadata: Stripe.Metadata | null | undefined
): PlanSlug {
  const slug = metadata?.gp_plan_slug?.trim();
  if (slug === "starter" || slug === "pro" || slug === "founder") return slug;
  return "pro";
}

export function founderCouponPreview(couponCode?: string, baseCents?: number) {
  const base = baseCents ?? OFFICIAL_PLANS.founder.monthlyPriceCents;
  return aplicarCupom(couponCode, base);
}
