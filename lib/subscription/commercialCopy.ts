import type { FeatureKey } from "@/lib/subscription/tiers";
import type { DbPlan } from "@/lib/subscription/permissions";

import type { SubscriptionTier } from "@/lib/subscription/tiers";

export const TIER_DISPLAY: Record<SubscriptionTier, string> = {
  free: "Gratuito",
  pro: "Profissional",
  institutional: "Elite",
};

export const UPGRADE_PATH = "/precos";

export const FEATURE_LABELS: Partial<Record<FeatureKey, string>> = {
  hero_premium: "Decisão principal do momento",
  advanced_alerts: "Alertas operacionais avançados",
  tactical_insights: "Leitura tática completa",
  timeline: "Linha do tempo completa",
  edge_full: "Vantagem e edge de mercado",
  audit_mode: "Modo auditoria operador",
  operator_mode: "Modo operador Elite",
  unlimited_matches: "Central ao vivo ilimitada",
  steam_alerts: "Alertas de steam",
  heatmap: "Mapa de calor e momentum",
};

export const FEATURE_REQUIRED_PLAN: Partial<Record<FeatureKey, DbPlan>> = {
  hero_premium: "fundador",
  advanced_alerts: "fundador",
  tactical_insights: "fundador",
  timeline: "fundador",
  edge_full: "fundador",
  audit_mode: "fundador",
  operator_mode: "fundador",
  unlimited_matches: "fundador",
  steam_alerts: "fundador",
  heatmap: "fundador",
};

export const ONBOARDING_STEPS = [
  {
    title: "Pressão ao vivo",
    body: "A barra mostra quem domina o jogo agora — sem precisar abrir estatísticas.",
    icon: "pressure",
  },
  {
    title: "Oportunidade",
    body: "O sistema destaca quando há vantagem contextual no mercado, com linguagem clara.",
    icon: "edge",
  },
  {
    title: "Intensidade",
    body: "Jogos quentes sobem na fila. Jogos frios ficam silenciosos — sua atenção vai ao que importa.",
    icon: "heat",
  },
  {
    title: "Narrativa",
    body: "Cada jogo traz uma linha de decisão: o que fazer agora, em menos de dois segundos.",
    icon: "narrative",
  },
] as const;

export const SOCIAL_PROOF_ITEMS = [
  {
    label: "Pressão alta detectada",
    detail: "Flamengo x Vasco · 67'",
    time: "há 4 min",
  },
  {
    label: "Oportunidade monitorada",
    detail: "Over 2.5 · leitura favorável",
    time: "há 11 min",
  },
  {
    label: "Steam de mercado",
    detail: "Odd principal em queda",
    time: "há 18 min",
  },
] as const;

export const TRUST_METRICS = [
  { value: "68%", label: "Leituras alinhadas ao backtest", sub: "amostra interna 90d" },
  { value: "24/7", label: "Central ao vivo", sub: "atualização contínua" },
  { value: "<2s", label: "Decisão por jogo", sub: "hierarquia operacional" },
] as const;
