import { isAdminEmail } from "@/lib/auth/admin";
import { ensureAdminAutoSubscription, fetchSubscriptionForUser } from "@/lib/commercial/db";
import type { AccountPayload } from "@/lib/auth/session";
import { getEffectivePlan } from "@/lib/auth/entitlements";
import type { DbPlan } from "@/lib/subscription/permissions";
import { planSlugToLegacyDbPlan } from "@/lib/billing/planSlugs";
import {
  fetchUserSubscription,
  resolveEffectivePlanSlug,
} from "@/lib/billing/userSubscriptionStore";

export async function resolveAccountPayload(input: {
  userId: string;
  email: string;
  name: string;
  profileRole?: string | null;
}): Promise<AccountPayload> {
  const isAdmin = isAdminEmail(input.email);
  let role: "user" | "admin" = isAdmin ? "admin" : "user";
  if (!isAdmin && input.profileRole === "admin") role = "admin";

  if (isAdmin) {
    await ensureAdminAutoSubscription(input.userId);
  }

  const legacySub = await fetchSubscriptionForUser(input.userId);
  const userSub = await fetchUserSubscription(input.userId);

  const planSlug = resolveEffectivePlanSlug(
    userSub,
    legacySub?.plan ?? undefined
  );
  const rawPlan: DbPlan = isAdmin
    ? "fundador"
    : (planSlugToLegacyDbPlan(planSlug) as DbPlan);

  const subscriptionStatus = isAdmin
    ? "active"
    : userSub?.status ?? legacySub?.status ?? (rawPlan === "free" ? "inactive" : "active");

  const plan = getEffectivePlan(rawPlan, role, subscriptionStatus);

  return {
    user: {
      id: input.userId,
      email: input.email,
      name: input.name,
      role,
    },
    plan,
    planSlug: isAdmin ? "founder" : planSlug,
    subscriptionStatus,
    couponCode: userSub?.coupon_code ?? legacySub?.coupon_code ?? null,
    stripeCustomerId: userSub?.stripe_customer_id ?? legacySub?.provider_customer_id ?? null,
    currentPeriodEnd: userSub?.current_period_end ?? legacySub?.current_period_end ?? null,
    cancelAtPeriodEnd: userSub?.cancel_at_period_end ?? false,
  };
}
