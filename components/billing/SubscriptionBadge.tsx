"use client";

import { useAuth } from "@/contexts/AuthContext";
import { OFFICIAL_PLANS } from "@/lib/billing/planSlugs";

export default function SubscriptionBadge({
  planSlug: planSlugProp,
  status: statusProp,
}: {
  planSlug?: import("@/lib/billing/planSlugs").PlanSlug;
  status?: string;
} = {}) {
  const auth = useAuth();
  const planSlug = planSlugProp ?? auth.planSlug;
  const subscriptionStatus = statusProp ?? auth.subscriptionStatus;
  const plan = OFFICIAL_PLANS[planSlug] ?? OFFICIAL_PLANS.free;

  const statusClass =
    subscriptionStatus === "active"
      ? "gp-billing-status--active"
      : subscriptionStatus === "trialing"
        ? "gp-billing-status--trialing"
        : "gp-billing-status--inactive";

  return (
    <span className={`gp-billing-badge ${statusClass}`}>
      {plan.name} · {subscriptionStatus}
    </span>
  );
}
