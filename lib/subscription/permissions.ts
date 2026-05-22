/**
 * Permissões por plano — mapeia plano comercial → tier interno do terminal.
 */

import type { FeatureKey, SubscriptionTier } from "@/lib/subscription/tiers";
import { canAccessFeature, TIERS } from "@/lib/subscription/tiers";
import { getTierLimits } from "@/lib/subscription/access";

export type DbPlan = "free" | "fundador" | "pro" | "elite";

/** Plano fundador recebe acesso equivalente ao Elite (institutional). */
export function dbPlanToTier(plan: DbPlan): SubscriptionTier {
  switch (plan) {
    case "fundador":
    case "elite":
      return "institutional";
    case "pro":
      return "pro";
    default:
      return "free";
  }
}

export function tierLabelPt(tier: SubscriptionTier): string {
  switch (tier) {
    case "free":
      return "Gratuito";
    case "pro":
      return "Profissional";
    case "institutional":
      return "Elite";
    default:
      return "Gratuito";
  }
}

export function planLabelPt(dbPlan: DbPlan): string {
  switch (dbPlan) {
    case "fundador":
      return "Plano Fundador";
    case "pro":
      return "Profissional";
    case "elite":
      return "Elite";
    default:
      return "Gratuito";
  }
}

export function canUseFeature(plan: DbPlan, feature: FeatureKey): boolean {
  return canAccessFeature(dbPlanToTier(plan), feature);
}

export function limitsForPlan(plan: DbPlan) {
  return getTierLimits(dbPlanToTier(plan));
}

export function isPaidPlan(plan: DbPlan): boolean {
  return plan === "fundador" || plan === "pro" || plan === "elite";
}

export function subscriptionActive(status: string): boolean {
  return status === "active" || status === "trialing";
}

export { TIERS, canAccessFeature, getTierLimits };
