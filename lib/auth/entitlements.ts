import type { SessionUser } from "@/lib/auth/session";
import {
  dbPlanToTier,
  isPaidPlan,
  subscriptionActive,
  type DbPlan,
} from "@/lib/subscription/permissions";
import { canAccessFeature, type FeatureKey, type SubscriptionTier } from "@/lib/subscription/tiers";

export function getEffectivePlan(
  rawPlan: DbPlan,
  role: SessionUser["role"],
  subscriptionStatus: string
): DbPlan {
  if (role === "admin") return "fundador";
  if (isPaidPlan(rawPlan) && subscriptionActive(subscriptionStatus)) return rawPlan;
  return "free";
}

export function hasTerminalAccess(
  plan: DbPlan,
  role: SessionUser["role"],
  subscriptionStatus: string
): boolean {
  if (role === "admin") return true;
  return isPaidPlan(plan) && subscriptionActive(subscriptionStatus);
}

export function hasFeatureAccess(
  plan: DbPlan,
  role: SessionUser["role"],
  subscriptionStatus: string,
  feature: FeatureKey
): boolean {
  if (role === "admin") return true;
  const effective = getEffectivePlan(plan, role, subscriptionStatus);
  const tier: SubscriptionTier = dbPlanToTier(effective);
  if (!subscriptionActive(subscriptionStatus) && isPaidPlan(plan)) return false;
  return canAccessFeature(tier, feature);
}

export function getPostLoginRedirect(input: {
  role: SessionUser["role"];
  plan: DbPlan;
  subscriptionStatus: string;
  redirectParam?: string | null;
}): string {
  const raw = input.redirectParam?.trim();
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    const authPages = ["/entrar", "/cadastro", "/login", "/signup"];
    if (!authPages.some((p) => raw === p || raw.startsWith(`${p}/`))) {
      return raw;
    }
  }
  if (input.role === "admin") return "/admin";
  if (hasTerminalAccess(input.plan, input.role, input.subscriptionStatus)) {
    return "/terminal";
  }
  return "/minha-central";
}

/** Mesma regra que /api/debug/session e requireAdmin (role derivado de ADMIN_EMAILS). */
export function hasAdminAccess(role: SessionUser["role"]): boolean {
  return role === "admin";
}

export function sessionDebugReason(input: {
  role: SessionUser["role"];
  plan: DbPlan;
  subscriptionStatus: string;
  loggedIn: boolean;
}): string {
  if (!input.loggedIn) return "nao_autenticado";
  if (input.role === "admin") return "admin_emails";
  if (hasTerminalAccess(input.plan, input.role, input.subscriptionStatus)) {
    return "plano_ativo";
  }
  return "plano_gratuito";
}
