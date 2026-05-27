/**
 * Controle de acesso por plano — fonte de verdade server-side.
 * Nunca confiar no client.
 */

import type { PlanSlug } from "@/lib/billing/planSlugs";
import { subscriptionActive } from "@/lib/subscription/permissions";
import type { FeatureKey } from "@/lib/subscription/tiers";
import { canAccessFeature, dbPlanToTier } from "@/lib/subscription/permissions";
import type { DbPlan } from "@/lib/subscription/permissions";
import { planSlugToLegacyDbPlan } from "@/lib/billing/planSlugs";

export type BillingFeature =
  | "terminal"
  | "gpi"
  | "replay"
  | "ops_center"
  | "telegram_alerts"
  | "copa_premium"
  | "network_exchange"
  | "quant_dashboard";

const PLAN_FEATURES: Record<PlanSlug, ReadonlySet<BillingFeature>> = {
  free: new Set(),
  starter: new Set(["terminal", "gpi"]),
  pro: new Set([
    "terminal",
    "gpi",
    "replay",
    "telegram_alerts",
    "copa_premium",
  ]),
  founder: new Set([
    "terminal",
    "gpi",
    "replay",
    "ops_center",
    "telegram_alerts",
    "copa_premium",
    "network_exchange",
    "quant_dashboard",
  ]),
};

const FEATURE_KEY_TO_BILLING: Partial<Record<FeatureKey, BillingFeature>> = {
  terminal: "terminal",
  gpi: "gpi",
  replay: "replay",
  ops_center: "ops_center",
  ops: "ops_center",
  telegram: "telegram_alerts",
  signal_exchange: "network_exchange",
  quant_dashboard: "quant_dashboard",
  tactical_insights: "copa_premium",
};

export function hasBillingFeatureAccess(
  planSlug: PlanSlug,
  status: string,
  feature: BillingFeature,
  role: "user" | "admin" = "user"
): boolean {
  if (role === "admin") return true;
  if (planSlug === "free") return false;
  if (!subscriptionActive(status)) return false;
  return PLAN_FEATURES[planSlug]?.has(feature) ?? false;
}

export interface AccessContext {
  planSlug: PlanSlug;
  legacyPlan: DbPlan;
  status: string;
  role: "user" | "admin";
}

export function hasFeatureAccess(ctx: AccessContext, feature: FeatureKey): boolean {
  if (ctx.role === "admin") return true;

  const billingFeature = FEATURE_KEY_TO_BILLING[feature];
  if (billingFeature && ctx.planSlug !== "free") {
    if (hasBillingFeatureAccess(ctx.planSlug, ctx.status, billingFeature, ctx.role)) {
      return true;
    }
    if (isPaidPlanSlugActive(ctx)) {
      return false;
    }
  }

  const tier = dbPlanToTier(ctx.legacyPlan);
  if (!subscriptionActive(ctx.status) && ctx.legacyPlan !== "free") return false;
  return canAccessFeature(tier, feature);
}

function isPaidPlanSlugActive(ctx: AccessContext): boolean {
  return ctx.planSlug !== "free" && subscriptionActive(ctx.status);
}

export function buildAccessContext(input: {
  planSlug: PlanSlug;
  status: string;
  role: "user" | "admin";
  legacyPlan?: DbPlan;
}): AccessContext {
  return {
    planSlug: input.planSlug,
    legacyPlan: input.legacyPlan ?? planSlugToLegacyDbPlan(input.planSlug),
    status: input.status,
    role: input.role,
  };
}

export { FEATURE_KEY_TO_BILLING };
