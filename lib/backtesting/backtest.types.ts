export type BacktestScenarioId = "agressivo" | "moderado" | "conservador";

export type SimulatedAction =
  | "alerta"
  | "oportunidade"
  | "monitoramento"
  | "ruptura_provavel"
  | "neutro";

export interface BacktestScenarioResult {
  scenarioId: BacktestScenarioId;
  scenarioLabel: string;
  validAnticipationRate: number;
  falsePositiveRate: number;
  contextualAccuracyPct: number;
  avgMinutesBeforeGoal: number;
  avgMarketDelayMinutes: number;
  samples: number;
}

export interface BacktestRankingEntry {
  key: string;
  label: string;
  score: number;
  samples: number;
}

export interface BacktestTimelineEvent {
  fixtureId: string;
  matchLabel: string;
  minute: number;
  action: SimulatedAction;
  contextLevel: string;
  outcome: "valido" | "falso_positivo" | "neutro";
  goalsAfter: number;
}

export interface BacktestSimulationRow {
  fixtureId: string;
  matchLabel: string;
  league: string;
  minute: number;
  action: SimulatedAction;
  contextScore: number;
  predictiveLevel: string;
  decisionSelo: string;
  actualOutcome: "HIT" | "MISS";
  evaluation: "valido" | "falso_positivo" | "neutro";
  minutesBeforeGoal: number | null;
  marketDelayMinutes: number | null;
}

export interface ContextualBacktestSnapshot {
  generatedAt: string;
  enabled: boolean;
  sandboxMode: boolean;
  overallAccuracyPct: number;
  validAnticipationRate: number;
  falsePositiveRate: number;
  avgMinutesBeforeGoal: number;
  avgMarketDelayMinutes: number;
  scenarios: BacktestScenarioResult[];
  topLeagues: BacktestRankingEntry[];
  topPatterns: BacktestRankingEntry[];
  topContexts: BacktestRankingEntry[];
  timeline: BacktestTimelineEvent[];
  recentSimulations: BacktestSimulationRow[];
  calibrationNote: string | null;
}
