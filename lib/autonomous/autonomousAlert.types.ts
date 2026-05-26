import type { ContextLevel } from "@/components/terminal/intelligence/contextRules";

export type AutonomousAlertKind =
  | "PRESSAO_EXTREMA"
  | "OPORTUNIDADE_CONTEXTUAL"
  | "DISTORCAO_COTACAO"
  | "MUDANCA_RITMO"
  | "SEQUENCIA_OFENSIVA"
  | "ZONA_CRITICA"
  | "FIM_JOGO_CRITICO"
  | "CONTEXTO_DESACELERANDO"
  | "LEITURA_ENCERRADA";

export type AutonomousAlertPriority = "baixa" | "moderada" | "alta" | "critica";

export interface AutonomousOperationalAlert {
  id: string;
  kind: AutonomousAlertKind;
  kindLabel: string;
  priority: AutonomousAlertPriority;
  fixtureId: string;
  matchId: string;
  matchLabel: string;
  league: string;
  minute: number;
  headline: string;
  narrative: string;
  contextScore: number;
  contextLevel: ContextLevel;
  situacao: string;
  acao: string;
  escalated: boolean;
  createdAt: string;
}

export interface AutonomousWatchlistEntry {
  fixtureId: string;
  matchLabel: string;
  minute: number;
  score: number;
  reason: string;
}

export interface AutonomousAlertMetrics {
  alertsSent: number;
  alertsBlocked: number;
  contextualPrecisionPct: number;
  matchesMonitored: number;
  sandboxMode: boolean;
  enabled: boolean;
}

export interface AutonomousAlertSnapshot {
  generatedAt: string;
  recentAlerts: AutonomousOperationalAlert[];
  watchlist: {
    maisPerigosos: AutonomousWatchlistEntry[];
    maisPromissores: AutonomousWatchlistEntry[];
    maisAcelerados: AutonomousWatchlistEntry[];
  };
  metrics: AutonomousAlertMetrics;
}
