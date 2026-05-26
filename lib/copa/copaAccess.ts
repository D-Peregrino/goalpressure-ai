import type { FeatureKey } from "@/lib/subscription/tiers";

/** Recursos gratuitos na área Copa (calendário, grupos, tabela, jogos). */
export const COPA_FREE_FEATURES = [
  "copa_calendar",
  "copa_groups",
  "copa_standings",
  "copa_matches",
] as const;

export type CopaFreeFeature = (typeof COPA_FREE_FEATURES)[number];

/** Recursos premium Copa. */
export const COPA_PREMIUM_FEATURES = [
  "copa_gpi",
  "copa_context",
  "copa_telegram",
  "copa_replay",
  "copa_ops",
] as const;

export type CopaPremiumFeature = (typeof COPA_PREMIUM_FEATURES)[number];

export type CopaFeatureKey = CopaFreeFeature | CopaPremiumFeature;

export const COPA_PREMIUM_TO_TIER_FEATURE: Record<CopaPremiumFeature, FeatureKey> = {
  copa_gpi: "gpi",
  copa_context: "tactical_insights",
  copa_telegram: "telegram",
  copa_replay: "replay",
  copa_ops: "ops_center",
};

export function isCopaPremiumFeature(f: CopaFeatureKey): f is CopaPremiumFeature {
  return (COPA_PREMIUM_FEATURES as readonly string[]).includes(f);
}
