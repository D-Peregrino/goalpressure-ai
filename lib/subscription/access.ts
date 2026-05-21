import type { SubscriptionTier } from "@/lib/subscription/tiers";
import { TIERS } from "@/lib/subscription/tiers";

const STORAGE_KEY = "gp_subscription_tier";
const SESSION_KEY = "gp_session";

export function parseTier(value: string | null | undefined): SubscriptionTier {
  if (value === "pro" || value === "institutional" || value === "free") {
    return value;
  }
  return "free";
}

export function getDefaultTier(): SubscriptionTier {
  const env = process.env.NEXT_PUBLIC_DEFAULT_TIER?.trim().toLowerCase();
  if (env === "pro" || env === "institutional") return env;
  return "free";
}

export function readStoredTier(): SubscriptionTier | null {
  if (typeof window === "undefined") return null;
  try {
    return parseTier(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredTier(tier: SubscriptionTier): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, tier);
    document.cookie = `${STORAGE_KEY}=${tier};path=/;max-age=31536000;SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

export function hasSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(localStorage.getItem(SESSION_KEY));
  } catch {
    return false;
  }
}

export function writeSession(email: string, tier: SubscriptionTier): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_KEY, email);
    writeStoredTier(tier);
  } catch {
    /* ignore */
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(STORAGE_KEY);
    document.cookie = `${STORAGE_KEY}=;path=/;max-age=0`;
  } catch {
    /* ignore */
  }
}

export function getTierLimits(tier: SubscriptionTier) {
  return TIERS[tier].limits;
}
