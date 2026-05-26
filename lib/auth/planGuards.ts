import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type { DbPlan } from "@/lib/subscription/permissions";
import { dbPlanToTier, subscriptionActive } from "@/lib/subscription/permissions";
import type { FeatureKey, SubscriptionTier } from "@/lib/subscription/tiers";
import { canAccessFeature, tierMeetsMinimum } from "@/lib/subscription/tiers";

export type PlanKey = "free" | "founder" | "pro" | "ops" | "admin";

function normalizeDbPlan(plan: string | null | undefined): DbPlan {
  const p = (plan ?? "free").toLowerCase();
  if (p === "founder") return "fundador";
  if (p === "ops") return "ops";
  if (p === "elite") return "elite";
  if (p === "pro") return "pro";
  if (p === "fundador") return "fundador";
  return "free";
}

const PLAN_MIN_TIER: Record<Exclude<PlanKey, "admin">, SubscriptionTier> = {
  free: "free",
  founder: "institutional",
  pro: "pro",
  ops: "institutional",
};

export function hasFeatureAccess(params: {
  plan: DbPlan;
  role: "user" | "admin";
  subscriptionStatus: string;
  feature: FeatureKey;
}): boolean {
  if (params.role === "admin") return true;
  if (params.plan !== "free" && !subscriptionActive(params.subscriptionStatus)) return false;
  const tier = dbPlanToTier(params.plan);
  return canAccessFeature(tier, params.feature);
}

/**
 * Server guard — requires logged user and minimum plan.
 * Returns null when denied.
 */
export async function requirePlan(
  request: NextRequest | Request,
  minimum: PlanKey
): Promise<{
  userId: string;
  email: string;
  role: "user" | "admin";
  plan: DbPlan;
  subscriptionStatus: string;
} | null> {
  const user = await requireUser(request as Request);
  if (!user) return null;
  if (user.role === "admin") {
    return { userId: user.id, email: user.email, role: "admin", plan: "fundador", subscriptionStatus: "active" };
  }

  const db = getSupabaseAdmin();
  if (!db || !isSupabaseConfigured()) {
    // Sem Supabase: somente free (não libera recursos pagos)
    if (minimum === "free") {
      return { userId: user.id, email: user.email, role: "user", plan: "free", subscriptionStatus: "inactive" };
    }
    return null;
  }

  const { data: sub } = await db
    .from("subscriptions")
    .select("plan,status")
    .eq("user_id", user.id)
    .maybeSingle();

  const plan = normalizeDbPlan(sub?.plan);
  const status = String(sub?.status ?? (plan === "free" ? "inactive" : "active"));

  if (minimum === "admin") return null;
  const requiredTier = PLAN_MIN_TIER[minimum];
  const tier = dbPlanToTier(plan);
  const allowed = tierMeetsMinimum(tier, requiredTier) && (plan === "free" || subscriptionActive(status));
  if (!allowed) return null;

  return { userId: user.id, email: user.email, role: "user", plan, subscriptionStatus: status };
}

