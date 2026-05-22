"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  canAccessFeature,
  type FeatureKey,
  type SubscriptionTier,
} from "@/lib/subscription/tiers";
import { dbPlanToTier, type DbPlan } from "@/lib/subscription/permissions";
import { getTierLimits } from "@/lib/subscription/access";

interface SubscriptionContextValue {
  tier: SubscriptionTier;
  plan: DbPlan;
  isAuthenticated: boolean;
  email: string | null;
  can: (feature: FeatureKey) => boolean;
  limits: ReturnType<typeof getTierLimits>;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const tier = dbPlanToTier(auth.plan);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      tier,
      plan: auth.plan,
      isAuthenticated: Boolean(auth.user),
      email: auth.user?.email ?? null,
      can: (feature) => canAccessFeature(tier, feature),
      limits: getTierLimits(tier),
      refresh: auth.refreshAccount,
    }),
    [tier, auth.plan, auth.user, auth.refreshAccount]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    const fallback: SubscriptionTier = "free";
    return {
      tier: fallback,
      plan: "free",
      isAuthenticated: false,
      email: null,
      can: (feature) => canAccessFeature(fallback, feature),
      limits: getTierLimits(fallback),
      refresh: async () => {},
    };
  }
  return ctx;
}

/** @deprecated use signIn/signUp do useAuth */
export function useLegacySubscriptionActions() {
  const auth = useAuth();
  return {
    login: async (_email: string, _tier?: SubscriptionTier) => {
      await auth.refreshAccount();
    },
    logout: auth.signOut,
    setTier: useCallback(async () => auth.refreshAccount(), [auth]),
  };
}
