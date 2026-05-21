"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  canAccessFeature,
  type FeatureKey,
  type SubscriptionTier,
} from "@/lib/subscription/tiers";
import {
  getDefaultTier,
  getTierLimits,
  hasSession,
  readStoredTier,
  writeSession,
  clearSession,
  writeStoredTier,
} from "@/lib/subscription/access";

interface SubscriptionContextValue {
  tier: SubscriptionTier;
  isAuthenticated: boolean;
  email: string | null;
  setTier: (tier: SubscriptionTier) => void;
  login: (email: string, tier?: SubscriptionTier) => void;
  logout: () => void;
  can: (feature: FeatureKey) => boolean;
  limits: ReturnType<typeof getTierLimits>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [tier, setTierState] = useState<SubscriptionTier>(getDefaultTier());
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredTier();
    if (stored) setTierState(stored);
    if (hasSession()) {
      try {
        setEmail(localStorage.getItem("gp_session"));
      } catch {
        /* ignore */
      }
    }
    setReady(true);
  }, []);

  const setTier = useCallback((next: SubscriptionTier) => {
    setTierState(next);
    writeStoredTier(next);
  }, []);

  const login = useCallback((userEmail: string, nextTier: SubscriptionTier = "pro") => {
    writeSession(userEmail, nextTier);
    setEmail(userEmail);
    setTierState(nextTier);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setEmail(null);
    setTierState("free");
  }, []);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      tier,
      isAuthenticated: Boolean(email),
      email,
      setTier,
      login,
      logout,
      can: (feature) => canAccessFeature(tier, feature),
      limits: getTierLimits(tier),
    }),
    [tier, email, setTier, login, logout]
  );

  if (!ready) {
    return <>{children}</>;
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    const fallbackTier = getDefaultTier();
    return {
      tier: fallbackTier,
      isAuthenticated: false,
      email: null,
      setTier: () => {},
      login: () => {},
      logout: () => {},
      can: (feature) => canAccessFeature(fallbackTier, feature),
      limits: getTierLimits(fallbackTier),
    };
  }
  return ctx;
}
