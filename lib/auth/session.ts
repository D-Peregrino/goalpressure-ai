export const AUTH_COOKIE = "gp_auth_session";
export const DEV_USER_COOKIE = "gp_dev_user_id";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
};

import type { DbPlan } from "@/lib/subscription/permissions";
import type { PlanSlug } from "@/lib/billing/planSlugs";

export type AccountPayload = {
  user: SessionUser;
  plan: DbPlan;
  planSlug: PlanSlug;
  subscriptionStatus: string;
  couponCode: string | null;
  stripeCustomerId?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
};
