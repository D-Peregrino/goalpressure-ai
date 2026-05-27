export {
  hasBillingFeatureAccess,
  hasFeatureAccess,
  buildAccessContext,
  type BillingFeature,
  type AccessContext,
} from "@/lib/billing/featureAccess";

export {
  OFFICIAL_PLANS,
  type PlanSlug,
  planSlugToLegacyDbPlan,
} from "@/lib/billing/planSlugs";

export {
  fetchUserSubscription,
  upsertUserSubscription,
} from "@/lib/billing/userSubscriptionStore";

export { stripeConfigured, createStripeCheckoutSession } from "@/lib/billing/stripe";
