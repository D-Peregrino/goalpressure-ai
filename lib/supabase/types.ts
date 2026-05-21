/**
 * Row shapes for GoalPressure Supabase tables (initial schema).
 */

export interface SignalRow {
  signal_id: string;
  model_id?: string | null;
  match_id?: string | null;
  external_id?: string | null;
  fixture_id?: string | null;
  market: string;
  confidence: string;
  pressure: number;
  odd: number;
  roi?: number | null;
  outcome?: string | null;
  status?: string | null;
  stake?: number | null;
  home_team?: string | null;
  away_team?: string | null;
  league?: string | null;
  trigger_minute?: number | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
  resolved_at?: string | null;
}

export interface MatchRow {
  external_id: string;
  fixture_id?: string | null;
  home_team: string;
  away_team: string;
  league?: string | null;
  minute?: number | null;
  pressure_score?: number | null;
  status?: string | null;
  score?: Record<string, unknown> | null;
  stats?: Record<string, unknown> | null;
  odds?: Record<string, unknown> | null;
  updated_at?: string;
  last_seen_at?: string;
}

export interface OpsLogRow {
  event: string;
  message: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface AnalyticsSnapshotRow {
  payload: Record<string, unknown>;
  generated_at?: string;
}

export interface SignalDispatchRow {
  id?: string;
  fixture_id: string;
  market: string;
  pressure_score: number;
  momentum: number;
  goal_probability: number;
  confidence: number;
  ev: number;
  fair_odd: number;
  market_odd: number;
  triggered: boolean;
  telegram_sent: boolean;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface TemporalMetricsRow {
  id?: string;
  fixture_id: string;
  minute: number;
  match_phase: string;
  temporal_pressure: number;
  urgency_multiplier: number;
  scoring_window_probability: number;
  late_goal_probability: number;
  exhaustion_factor: number;
  chaos_index: number;
  market_lag_factor: number;
  acceleration_score: number;
  volatility_score: number;
  execution_priority: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface MarketEdgeRow {
  id?: string;
  fixture_id: string;
  market: string;
  proprietary_probability: number;
  implied_probability: number;
  edge: number;
  edge_percent: number;
  fair_odd: number;
  market_odd: number;
  expected_value: number;
  confidence: number;
  mispricing_score: number;
  classification: string;
  closing_line_delta?: number | null;
  odds_drift?: number | null;
  steam_move?: boolean;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface MarketSnapshotRow {
  id?: string;
  fixture_id: string;
  market: string;
  snapshot_type: string;
  market_odd: number;
  proprietary_probability: number;
  implied_probability: number;
  edge: number;
  expected_value: number;
  mispricing_score: number;
  closing_line_delta?: number | null;
  odds_drift?: number | null;
  steam_move?: boolean;
  sharp_pressure?: number | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
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

export interface LiveMetricsRow {
  id?: string;
  fixture_id: string;
  home_pressure: number;
  away_pressure: number;
  momentum: number;
  goal_probability: number;
  confidence: number;
  metadata?: Record<string, unknown>;
  created_at?: string;
}
