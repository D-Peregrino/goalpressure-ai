/**
 * Tiers comerciais GoalPressure AI — SaaS (sem lógica de billing ainda).
 */

export type SubscriptionTier = "free" | "pro" | "institutional";

export interface TierDefinition {
  id: SubscriptionTier;
  name: string;
  priceLabel: string;
  description: string;
  trialDays: number;
  features: string[];
  limits: {
    liveMatches: number;
    marketsPerMatch: number;
    enginesDepth: "basic" | "full" | "institutional";
    opsAccess: boolean;
    apiAccess: boolean;
  };
}

export const TIERS: Record<SubscriptionTier, TierDefinition> = {
  free: {
    id: "free",
    name: "Free",
    priceLabel: "R$ 0",
    description: "Radar live básico e pressão em tempo real.",
    trialDays: 0,
    features: [
      "Terminal live (até 6 jogos)",
      "Pressure score",
      "Odds primárias",
      "Filtros básicos",
    ],
    limits: {
      liveMatches: 6,
      marketsPerMatch: 2,
      enginesDepth: "basic",
      opsAccess: false,
      apiAccess: false,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceLabel: "R$ 297/mês",
    description: "Desk quantitativo completo para operação ao vivo.",
    trialDays: 7,
    features: [
      "Terminal ilimitado",
      "Market calibration + EV",
      "Steam & drift",
      "Chaos radar",
      "Heatmaps & timeline",
      "Alertas Telegram",
    ],
    limits: {
      liveMatches: 999,
      marketsPerMatch: 8,
      enginesDepth: "full",
      opsAccess: false,
      apiAccess: false,
    },
  },
  institutional: {
    id: "institutional",
    name: "Institutional",
    priceLabel: "Custom",
    description: "SLA, API dedicada e consenso multi-desk.",
    trialDays: 14,
    features: [
      "Tudo do Pro",
      "Ops dashboard",
      "API & webhooks",
      "Calibração dedicada",
      "Suporte prioritário",
    ],
    limits: {
      liveMatches: 999,
      marketsPerMatch: 16,
      enginesDepth: "institutional",
      opsAccess: true,
      apiAccess: true,
    },
  },
};

export const TIER_ORDER: SubscriptionTier[] = [
  "free",
  "pro",
  "institutional",
];

export type FeatureKey =
  | "heatmap"
  | "chaos_radar"
  | "edge_full"
  | "fair_odd"
  | "steam_alerts"
  | "timeline"
  | "ops"
  | "unlimited_matches";

const FEATURE_MIN_TIER: Record<FeatureKey, SubscriptionTier> = {
  heatmap: "pro",
  chaos_radar: "pro",
  edge_full: "pro",
  fair_odd: "pro",
  steam_alerts: "pro",
  timeline: "pro",
  ops: "institutional",
  unlimited_matches: "pro",
};

const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 1,
  institutional: 2,
};

export function tierMeetsMinimum(
  current: SubscriptionTier,
  required: SubscriptionTier
): boolean {
  return TIER_RANK[current] >= TIER_RANK[required];
}

export function canAccessFeature(
  tier: SubscriptionTier,
  feature: FeatureKey
): boolean {
  return tierMeetsMinimum(tier, FEATURE_MIN_TIER[feature]);
}
