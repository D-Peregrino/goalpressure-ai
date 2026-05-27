import type { SessionUser } from "@/lib/auth/session";
import {
  dbPlanToTier,
  isPaidPlan,
  subscriptionActive,
  type DbPlan,
} from "@/lib/subscription/permissions";
import type { FeatureKey, SubscriptionTier } from "@/lib/subscription/tiers";
import {
  buildAccessContext,
  hasFeatureAccess as hasFeatureAccessBilling,
} from "@/lib/billing/featureAccess";
import type { PlanSlug } from "@/lib/billing/planSlugs";
import { planSlugToLegacyDbPlan } from "@/lib/billing/planSlugs";

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
  subscriptionStatus: string,
  planSlug: PlanSlug = planSlugFromDb(plan)
): boolean {
  return hasFeatureAccess(plan, role, subscriptionStatus, "terminal", planSlug);
}

export function hasFeatureAccess(
  plan: DbPlan,
  role: SessionUser["role"],
  subscriptionStatus: string,
  feature: FeatureKey,
  planSlug?: PlanSlug
): boolean {
  const slug = planSlug ?? planSlugFromDb(plan);
  const ctx = buildAccessContext({
    planSlug: slug,
    status: subscriptionStatus,
    role,
    legacyPlan: plan,
  });
  return hasFeatureAccessBilling(ctx, feature);
}

function planSlugFromDb(plan: DbPlan): PlanSlug {
  if (plan === "fundador" || plan === "elite" || plan === "ops") return "founder";
  if (plan === "starter") return "starter";
  if (plan === "pro") return "pro";
  return "free";
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

export { dbPlanToTier, type SubscriptionTier, planSlugToLegacyDbPlan };
