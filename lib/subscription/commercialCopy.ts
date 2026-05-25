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
    title: "Intensidade ofensiva",
    body: "A barra de pressão mostra quem está atacando com mais volume agora — sem abrir estatísticas.",
    icon: "pressure",
  },
  {
    title: "Leitura tática",
    body: "Cada jogo traz contexto tático: ritmo, domínio e onde o jogo pode virar nos próximos minutos.",
    icon: "tactical",
  },
  {
    title: "Narrativa IA",
    body: "Uma linha clara resume o momento: o que está acontecendo e o que merece sua atenção.",
    icon: "narrative",
  },
  {
    title: "Vantagem encontrada",
    body: "Quando há edge contextual no mercado, o sistema destaca com linguagem direta — sem jargão.",
    icon: "edge",
  },
  {
    title: "Momento quente",
    body: "Jogos quentes sobem na fila. Jogos frios ficam silenciosos — você foca no que importa.",
    icon: "heat",
  },
] as const;

export const SPOTLIGHT_STEPS = [
  {
    title: "Sua central",
    body: "Tudo que você favorita, acompanha e salva fica aqui — sincronizado entre dispositivos.",
    target: "[data-gp-tour='central-hero']",
  },
  {
    title: "Favoritos e acompanhados",
    body: "Marque jogos na central ao vivo; eles aparecem neste painel em segundos.",
    target: "[data-gp-tour='favorites']",
  },
  {
    title: "Jogos mais quentes",
    body: "A lista prioriza pressão alta e jogos que você já segue.",
    target: "[data-gp-tour='hot-matches']",
  },
  {
    title: "Central ao vivo",
    body: "Abra o terminal para ver pressão, leitura tática e narrativa em tempo real.",
    target: "[data-gp-tour='terminal-link']",
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
