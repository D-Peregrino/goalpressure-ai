/**
 * Copy de produto — central esportiva premium (UI only).
 */

import type { SubscriptionTier } from "@/lib/subscription/tiers";
import { tierMeetsMinimum } from "@/lib/subscription/tiers";

export const BRAND_PRODUCT = {
  tagline: "Leitura esportiva em tempo real",
  subtitle:
    "Placar, intensidade, oportunidades e mercado — tudo numa central pensada para decisão rápida.",
  footer: "Central esportiva · GoalPressure",
} as const;

/** Navegação principal — terminal core (módulos experimentais ocultos). */
export const NAV_ITEMS = [
  { href: "/terminal", label: "Terminal", short: "Terminal" },
  { href: "/minha-central", label: "Minha central", short: "Central" },
  { href: "/workspace", label: "Workspace", short: "Workspace" },
] as const;

export type NavItem = {
  href: string;
  label: string;
  short: string;
  advancedOnly?: boolean;
};

export function navItemsForTier(
  _tier: SubscriptionTier,
  _opsAccess: boolean,
  isAdmin = false
): NavItem[] {
  const items: NavItem[] = NAV_ITEMS.map((item) => ({
    href: item.href,
    label: item.label,
    short: item.short,
  }));
  if (isAdmin) {
    return [{ href: "/admin", label: "Admin", short: "Admin" }, ...items];
  }
  return items;
}

export const PAGE_COPY = {
  analytics: {
    title: "Insights visuais",
    subtitle: "Desempenho dos alertas e leituras — em linguagem clara",
    intro:
      "Veja como as oportunidades e leituras se comportaram ao longo do tempo, por mercado e intensidade.",
  },
  validation: {
    title: "Precisão do sistema",
    subtitle: "Quão confiável está a leitura ao vivo",
    intro:
      "Calibração contínua: acertos, falsos positivos e segmentos onde o modelo performa melhor.",
  },
  backtest: {
    title: "Histórico de performance",
    subtitle: "Resultados passados do modelo",
    intro:
      "Retrospectiva institucional para entender consistência antes de confiar no ao vivo.",
  },
  research: {
    title: "Central de leitura tática",
    subtitle: "Experimentos e padrões do jogo",
    intro:
      "Explorações táticas e inteligência experimental — para quem quer ir além do placar.",
  },
  models: {
    title: "Configurações avançadas",
    subtitle: "Parâmetros do modelo (somente leitura)",
    intro:
      "Limites e thresholds usados pelo motor de decisão. Área para operadores avançados.",
  },
  feed: {
    title: "Feed ao vivo",
    subtitle: "Monitoramento rápido de partidas",
  },
} as const;

/** Termos técnicos → linguagem esportiva */
export const TERM = {
  edge: "Vantagem encontrada",
  pressure: "Intensidade ofensiva",
  chaos: "Ritmo imprevisível",
  strongEntry: "Janela forte",
  dispatch: "Entradas enviadas",
  hitRate: "Taxa de acerto",
  roi: "Retorno acumulado",
  signals: "Alertas",
  steam: "Mercado acelerando",
  execute: "Oportunidade",
  monitor: "Acompanhar",
  momentum: "Impulso do jogo",
  fairOdd: "Odd justa",
  ev: "Valor esperado",
  drawdown: "Queda máxima",
  confidence: "Confiança",
  market: "Mercado",
  pending: "Em aberto",
  resolved: "Encerrados",
  hit: "Acerto",
  miss: "Erro",
} as const;

export const STATUS_LABEL: Record<string, string> = {
  LIVE: "Ao vivo",
  ONLINE: "Conectado",
  SYNC: "Sincronizando",
  DEGRADED: "Instável",
  ERROR: "Erro",
  OFFLINE: "Offline",
  ACTIVE: "Ativo",
  READY: "Pronto",
  IDLE: "Aguardando",
};

export const ANALYTICS_KPI = {
  totalSignals: "Total de alertas",
  hitRate: "Taxa de acerto",
  roiTotal: "Retorno total",
  roiAvg: "Retorno médio",
  avgOdds: "Odd média",
  avgPressure: "Intensidade média",
  maxDrawdown: "Queda máxima",
  bestStreak: "Melhor sequência",
  coreMetrics: "Indicadores principais",
  cumulativeRoi: "Evolução do retorno",
  roiByMarket: "Retorno por mercado",
  roiByConfidence: "Retorno por confiança",
  pressureDist: "Distribuição de intensidade",
  recentResolved: "Alertas recentes encerrados",
  updated: "Atualizado em",
  processed: "Alertas processados",
  source: "Fonte de dados",
  feed: "Feed",
  latency: "Tempo de resposta",
  loading: "Carregando insights…",
  empty: "Ainda sem histórico de insights",
  emptyHint: "Quando alertas forem resolvidos, os gráficos aparecem aqui.",
  noResolved: "Nenhum alerta encerrado ainda",
} as const;

export const ENGINE_DISPLAY: Record<string, { name: string; desc: string }> = {
  pressure: {
    name: "Intensidade ofensiva",
    desc: "Força de ataque e pressão em tempo real.",
  },
  temporal: {
    name: "Ritmo do jogo",
    desc: "Fase, urgência e janelas do confronto.",
  },
  player: {
    name: "Impacto em campo",
    desc: "Jogadores e resistência defensiva.",
  },
  microevent: {
    name: "Ondas de ataque",
    desc: "Rajadas e momentos de ritmo imprevisível.",
  },
  sequence: {
    name: "Sequências",
    desc: "Memória de jogadas e impulso falso.",
  },
  market: {
    name: "Leitura de mercado",
    desc: "Vantagem, odd justa e distorção.",
  },
  signal: {
    name: "Decisão de entrada",
    desc: "Quando vale a pena agir no mercado.",
  },
  backtest: {
    name: "Histórico",
    desc: "Validação em dados passados.",
  },
  meta: {
    name: "Consenso",
    desc: "Combinação dos motores de leitura.",
  },
};

export const ENGINE_STRIP = {
  title: "Motor ao vivo",
  loading: "Carregando leitura ao vivo…",
  strongestP: "Maior intensidade",
  level: "Nível",
  momentum: "Impulso",
  acceleration: "Aceleração",
  topEv: "Melhor valor",
  queue: "Fila de envio",
  signals: "Sinais ativos",
} as const;
