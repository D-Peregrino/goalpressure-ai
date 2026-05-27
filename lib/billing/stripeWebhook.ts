import type Stripe from "stripe";
import { logError, logInfo } from "@/lib/utils/logger";
import {
  mapStripeSubscriptionStatus,
  planSlugFromStripeMetadata,
} from "@/lib/billing/stripe";
import type { PlanSlug } from "@/lib/billing/planSlugs";
import {
  recordSubscriptionInvoice,
  upsertUserSubscription,
  fetchUserSubscription,
} from "@/lib/billing/userSubscriptionStore";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { CUPOM_BARBOSATIPS75 } from "@/lib/subscription/plans";

async function logBillingEvent(input: {
  userId?: string;
  eventType: string;
  providerEventId: string;
  status?: string;
  payload: unknown;
}) {
  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) return;
  await admin.from("billing_events").insert({
    user_id: input.userId ?? null,
    provider: "stripe",
    event_type: input.eventType,
    status: input.status ?? null,
    provider_event_id: input.providerEventId,
    payload: input.payload as Record<string, unknown>,
  });
}

function periodEnd(sub: Stripe.Subscription): Date | null {
  const end = sub.current_period_end;
  return end ? new Date(end * 1000) : null;
}

function trialEnd(sub: Stripe.Subscription): Date | null {
  const end = sub.trial_end;
  return end ? new Date(end * 1000) : null;
}

async function syncFromStripeSubscription(
  sub: Stripe.Subscription,
  fallbackUserId?: string
): Promise<void> {
  const userId =
    sub.metadata?.gp_user_id?.trim() ||
    fallbackUserId ||
    sub.metadata?.user_id?.trim();
  if (!userId) {
    logError("stripe", "Subscription sem gp_user_id", { subId: sub.id });
    return;
  }

  const planSlug: PlanSlug = planSlugFromStripeMetadata(sub.metadata);
  const status = mapStripeSubscriptionStatus(sub.status);
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;

  let couponCode: string | null = null;
  if (sub.discount?.coupon?.id) {
    couponCode = sub.metadata?.gp_coupon?.trim() || CUPOM_BARBOSATIPS75;
  }

  await upsertUserSubscription({
    userId,
    planSlug: status === "canceled" ? "free" : planSlug,
    status: status === "canceled" ? "canceled" : status,
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    currentPeriodEnd: periodEnd(sub),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    couponCode,
    trialEndsAt: trialEnd(sub),
  });

  logInfo("stripe", "user_subscriptions synced", { userId, planSlug, status });
}

export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  await logBillingEvent({
    eventType: event.type,
    providerEventId: event.id,
    payload: event.data.object,
  });

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id ?? session.metadata?.gp_user_id;
      if (!userId || !session.subscription) break;

      const stripe = await import("@/lib/billing/stripe").then((m) => m.getStripe());
      const sub = await stripe.subscriptions.retrieve(String(session.subscription));
      const planSlug = planSlugFromStripeMetadata(
        session.metadata ?? sub.metadata
      );
      sub.metadata = { ...sub.metadata, gp_user_id: userId, gp_plan_slug: planSlug };
      await syncFromStripeSubscription(sub, userId);

      if (session.customer && typeof session.customer === "string") {
        const existing = await fetchUserSubscription(userId);
        if (!existing?.stripe_customer_id) {
          await upsertUserSubscription({
            userId,
            planSlug,
            status: mapStripeSubscriptionStatus(sub.status),
            stripeCustomerId: session.customer,
            stripeSubscriptionId: sub.id,
            currentPeriodEnd: periodEnd(sub),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            couponCode: session.metadata?.gp_coupon ?? null,
            trialEndsAt: trialEnd(sub),
          });
        }
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await syncFromStripeSubscription(sub);
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const userId = invoice.metadata?.gp_user_id;
      if (!userId) break;
      const userSub = await fetchUserSubscription(userId);
      await recordSubscriptionInvoice({
        userId,
        userSubscriptionId: userSub?.id,
        stripeInvoiceId: invoice.id,
        amountCents: invoice.amount_paid ?? 0,
        currency: invoice.currency ?? "brl",
        status: "paid",
        paidAt: invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : new Date(),
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const userId = invoice.metadata?.gp_user_id;
      if (!userId) break;
      await recordSubscriptionInvoice({
        userId,
        stripeInvoiceId: invoice.id,
        amountCents: invoice.amount_due ?? 0,
        currency: invoice.currency ?? "brl",
        status: "failed",
      });
      const userSub = await fetchUserSubscription(userId);
      if (userSub) {
        await upsertUserSubscription({
          userId,
          planSlug: userSub.plan_slug,
          status: "past_due",
          stripeCustomerId: userSub.stripe_customer_id,
          stripeSubscriptionId: userSub.stripe_subscription_id,
          currentPeriodEnd: userSub.current_period_end
            ? new Date(userSub.current_period_end)
            : null,
          cancelAtPeriodEnd: userSub.cancel_at_period_end,
          couponCode: userSub.coupon_code,
        });
      }
      break;
    }

    default:
      break;
  }
}
