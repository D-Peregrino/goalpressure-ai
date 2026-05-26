/**
 * Tiers comerciais GoalPressure — FREE · PRO · ELITE (id: institutional)
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
    alertPreview: number;
    timelinePreview: number;
    enginesDepth: "basic" | "full" | "institutional";
    opsAccess: boolean;
    apiAccess: boolean;
  };
}

export const TIERS: Record<SubscriptionTier, TierDefinition> = {
  free: {
    id: "free",
    name: "Gratuito",
    priceLabel: "R$ 0",
    description: "Amostra da central ao vivo — ideal para conhecer a leitura.",
    trialDays: 0,
    features: [
      "Até 6 jogos na central",
      "Placar e pressão básica",
      "Favoritos e filtros",
      "Prévia de alertas e timeline",
    ],
    limits: {
      liveMatches: 6,
      marketsPerMatch: 2,
      alertPreview: 2,
      timelinePreview: 3,
      enginesDepth: "basic",
      opsAccess: false,
      apiAccess: false,
    },
  },
  pro: {
    id: "pro",
    name: "Profissional",
    priceLabel: "R$ 297/mês",
    description: "Central completa, alertas, hero e leitura tática para operação ao vivo.",
    trialDays: 7,
    features: [
      "Central ilimitada",
      "Hero e alertas avançados",
      "Timeline e leitura tática",
      "Edge, steam e heatmaps",
      "Trial 7 dias",
    ],
    limits: {
      liveMatches: 999,
      marketsPerMatch: 8,
      alertPreview: 999,
      timelinePreview: 999,
      enginesDepth: "full",
      opsAccess: false,
      apiAccess: false,
    },
  },
  institutional: {
    id: "institutional",
    name: "Elite",
    priceLabel: "R$ 697/mês",
    description: "Modo operador, auditoria e prioridade máxima na central.",
    trialDays: 14,
    features: [
      "Tudo do Pro",
      "Modo auditoria",
      "Prioridade operacional",
      "Leitura avançada e suporte",
      "Trial 14 dias",
    ],
    limits: {
      liveMatches: 999,
      marketsPerMatch: 16,
      alertPreview: 999,
      timelinePreview: 999,
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
  | "landing"
  | "demo"
  | "terminal"
  | "gpi"
  | "workspace"
  | "telegram"
  | "replay"
  | "ops_center"
  | "signal_exchange"
  | "quant_dashboard"
  | "heatmap"
  | "chaos_radar"
  | "edge_full"
  | "fair_odd"
  | "steam_alerts"
  | "timeline"
  | "ops"
  | "unlimited_matches"
  | "hero_premium"
  | "advanced_alerts"
  | "tactical_insights"
  | "audit_mode"
  | "operator_mode";

const FEATURE_MIN_TIER: Record<FeatureKey, SubscriptionTier> = {
  landing: "free",
  demo: "free",
  terminal: "pro",
  gpi: "pro",
  workspace: "pro",
  telegram: "pro",
  replay: "pro",
  ops_center: "institutional",
  signal_exchange: "institutional",
  quant_dashboard: "institutional",
  heatmap: "pro",
  chaos_radar: "pro",
  edge_full: "pro",
  fair_odd: "pro",
  steam_alerts: "pro",
  timeline: "pro",
  ops: "institutional",
  unlimited_matches: "pro",
  hero_premium: "pro",
  advanced_alerts: "pro",
  tactical_insights: "pro",
  audit_mode: "institutional",
  operator_mode: "institutional",
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

export function nextTierForFeature(feature: FeatureKey): SubscriptionTier {
  return FEATURE_MIN_TIER[feature];
}
