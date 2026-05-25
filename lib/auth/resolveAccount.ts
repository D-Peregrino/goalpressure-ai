import { isAdminEmail } from "@/lib/auth/admin";
import { ensureAdminAutoSubscription, fetchSubscriptionForUser } from "@/lib/commercial/db";
import type { AccountPayload } from "@/lib/auth/session";
import { getEffectivePlan } from "@/lib/auth/entitlements";
import type { DbPlan } from "@/lib/subscription/permissions";

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

  const sub = await fetchSubscriptionForUser(input.userId);
  const rawPlan = (sub?.plan as DbPlan) ?? "free";
  const subscriptionStatus = isAdmin
    ? "active"
    : sub?.status ?? (rawPlan === "free" ? "inactive" : "active");

  const plan = getEffectivePlan(rawPlan, role, subscriptionStatus);

  return {
    user: {
      id: input.userId,
      email: input.email,
      name: input.name,
      role,
    },
    plan,
    subscriptionStatus,
    couponCode: sub?.coupon_code ?? null,
  };
}
