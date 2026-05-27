/**
 * Planos oficiais SaaS — slugs persistidos em user_subscriptions.
 */

export type PlanSlug = "free" | "starter" | "pro" | "founder";

export const PLAN_SLUGS: PlanSlug[] = ["free", "starter", "pro", "founder"];

export const TRIAL_DAYS_STARTER_PRO = 7;

export interface OfficialPlan {
  slug: PlanSlug;
  name: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  features: string[];
  trialDays: number;
  stripePriceMonthlyEnv: string;
  stripePriceYearlyEnv?: string;
}

export const OFFICIAL_PLANS: Record<PlanSlug, OfficialPlan> = {
  free: {
    slug: "free",
    name: "Free",
    monthlyPriceCents: 0,
    yearlyPriceCents: 0,
    features: ["landing", "demo"],
    trialDays: 0,
    stripePriceMonthlyEnv: "",
  },
  starter: {
    slug: "starter",
    name: "Starter",
    monthlyPriceCents: 4900,
    yearlyPriceCents: 47000,
    features: ["terminal", "gpi", "workspace"],
    trialDays: TRIAL_DAYS_STARTER_PRO,
    stripePriceMonthlyEnv: "STRIPE_PRICE_STARTER_MONTHLY",
    stripePriceYearlyEnv: "STRIPE_PRICE_STARTER_YEARLY",
  },
  pro: {
    slug: "pro",
    name: "Pro",
    monthlyPriceCents: 9700,
    yearlyPriceCents: 97000,
    features: [
      "terminal",
      "gpi",
      "replay",
      "telegram_alerts",
      "copa_premium",
      "workspace",
      "timeline",
    ],
    trialDays: TRIAL_DAYS_STARTER_PRO,
    stripePriceMonthlyEnv: "STRIPE_PRICE_PRO_MONTHLY",
    stripePriceYearlyEnv: "STRIPE_PRICE_PRO_YEARLY",
  },
  founder: {
    slug: "founder",
    name: "Founder",
    monthlyPriceCents: 4900,
    yearlyPriceCents: 47000,
    features: [
      "terminal",
      "gpi",
      "replay",
      "ops_center",
      "telegram_alerts",
      "copa_premium",
      "network_exchange",
      "quant_dashboard",
    ],
    trialDays: 0,
    stripePriceMonthlyEnv: "STRIPE_PRICE_FOUNDER_MONTHLY",
    stripePriceYearlyEnv: "STRIPE_PRICE_FOUNDER_YEARLY",
  },
};

export function isPaidPlanSlug(slug: string): slug is Exclude<PlanSlug, "free"> {
  return slug === "starter" || slug === "pro" || slug === "founder";
}

export function planSlugToLegacyDbPlan(slug: PlanSlug): import("@/lib/subscription/permissions").DbPlan {
  switch (slug) {
    case "founder":
      return "fundador";
    case "pro":
      return "pro";
    case "starter":
      return "starter";
    default:
      return "free";
  }
}
