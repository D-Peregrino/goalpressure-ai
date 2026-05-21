/**
 * GoalPressure AI — backtesting domain types.
 */

import type { MarketType, MatchScore, MatchStatus } from "@/types/domain";

export type BacktestStrategy =
  | "signal_decision_ev_plus"
  | "all_triggered_dispatches";

export interface BacktestHistoricalMatch {
  fixtureId: string;
  matchId?: string;
  homeTeam?: string;
  awayTeam?: string;
  league?: string;
  status?: MatchStatus;
  finalScore: MatchScore | null;
  goalsAtTrigger?: number;
  triggerMinute?: number;
  lastSeenAt?: string;
}

export interface BacktestLiveMetricRow {
  id?: string;
  fixtureId: string;
  pressureScore?: number;
  momentum?: number;
  goalProbability?: number;
  confidence?: number;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

export interface BacktestSignalDispatchRow {
  id?: string;
  fixtureId: string;
  market: string;
  pressureScore: number;
  momentum: number;
  goalProbability: number;
  confidence: number;
  ev: number;
  fairOdd: number;
  marketOdd: number;
  triggered: boolean;
  telegramSent?: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface BacktestHistoricalInput {
  matches: BacktestHistoricalMatch[];
  liveMetrics?: BacktestLiveMetricRow[];
  signalDispatches: BacktestSignalDispatchRow[];
  strategy?: BacktestStrategy;
}

export interface BacktestStreaks {
  maxWinStreak: number;
  maxLoseStreak: number;
  currentWinStreak: number;
  currentLoseStreak: number;
}

export interface BacktestTradeResult {
  dispatchId: string;
  fixtureId: string;
  market: MarketType;
  odd: number;
  ev: number;
  pressureScore: number;
  momentum: number;
  confidence: number;
  goalsAtTrigger: number;
  goalsAtResolution: number;
  newGoalsAfterTrigger: number;
  outcome: "WIN" | "LOSS" | "PENDING";
  profitUnits: number;
  roi: number;
  realizedEv: number;
  triggerMinute: number;
  createdAt: string;
}

export interface HistoricalBacktestResult {
  strategy: BacktestStrategy;
  market: string;
  totalSignals: number;
  wins: number;
  losses: number;
  pending: number;
  roi: number;
  yield: number;
  hitRate: number;
  averageEv: number;
  averageOdd: number;
  profitUnits: number;
  maxDrawdown: number;
  streaks: BacktestStreaks;
  sharpeLikeRatio: number;
  trades: BacktestTradeResult[];
  runAt: string;
}

export interface BacktestResultsRow {
  id?: string;
  strategy: string;
  market: string;
  total_signals: number;
  wins: number;
  losses: number;
  roi: number;
  yield: number;
  hit_rate: number;
  profit_units: number;
  max_drawdown: number;
  metadata?: Record<string, unknown>;
  created_at?: string;
}
