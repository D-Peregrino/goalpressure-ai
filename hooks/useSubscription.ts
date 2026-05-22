"use client";

import { useAuth } from "@/hooks/useAuth";
import { useSubscription as useLegacySubscription } from "@/contexts/SubscriptionContext";
import {
  canUseFeature,
  dbPlanToTier,
  limitsForPlan,
  subscriptionActive,
  type DbPlan,
} from "@/lib/subscription/permissions";
import type { FeatureKey } from "@/lib/subscription/tiers";

/**
 * Assinatura unificada: prioriza plano do usuário autenticado (Supabase/dev),
 * com fallback no contexto legado (demo localStorage).
 */
export function useSubscription() {
  const auth = useAuth();
  const legacy = useLegacySubscription();

  const plan: DbPlan = auth.user ? auth.plan : mapLegacyTier(legacy.tier);
  const tier = dbPlanToTier(plan);
  const isAuthenticated = Boolean(auth.user) || legacy.isAuthenticated;
  const email = auth.user?.email ?? legacy.email;
  const paid = subscriptionActive(auth.subscriptionStatus) && plan !== "free";

  return {
    plan,
    tier,
    email,
    isAuthenticated,
    paid,
    couponCode: auth.couponCode,
    subscriptionStatus: auth.subscriptionStatus,
    can: (feature: FeatureKey) => canUseFeature(plan, feature),
    limits: limitsForPlan(plan),
    refresh: auth.refreshAccount,
  };
}

function mapLegacyTier(tier: string): DbPlan {
  if (tier === "institutional") return "elite";
  if (tier === "pro") return "pro";
  return "free";
}
