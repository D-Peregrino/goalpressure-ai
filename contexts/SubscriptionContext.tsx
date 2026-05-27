"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { hasFeatureAccess } from "@/lib/auth/entitlements";
import {
  type FeatureKey,
  type SubscriptionTier,
} from "@/lib/subscription/tiers";
import { dbPlanToTier, type DbPlan } from "@/lib/subscription/permissions";
import { getTierLimits } from "@/lib/subscription/access";

interface SubscriptionContextValue {
  tier: SubscriptionTier;
  plan: DbPlan;
  isAuthenticated: boolean;
  isAdmin: boolean;
  email: string | null;
  can: (feature: FeatureKey) => boolean;
  limits: ReturnType<typeof getTierLimits>;
  refresh: () => Promise<unknown>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const role = auth.user?.role ?? "user";
  const tier = dbPlanToTier(auth.plan);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      tier,
      plan: auth.plan,
      isAuthenticated: Boolean(auth.user),
      isAdmin: auth.isAdmin,
      email: auth.user?.email ?? null,
      can: (feature) =>
        hasFeatureAccess(
          auth.plan,
          role,
          auth.subscriptionStatus,
          feature,
          auth.planSlug
        ),
      limits: getTierLimits(tier),
      refresh: auth.refreshAccount,
    }),
    [
      tier,
      auth.plan,
      auth.planSlug,
      auth.user,
      auth.isAdmin,
      auth.subscriptionStatus,
      role,
      auth.refreshAccount,
    ]
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
      isAdmin: false,
      email: null,
      can: (feature) => hasFeatureAccess("free", "user", "inactive", feature),
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
