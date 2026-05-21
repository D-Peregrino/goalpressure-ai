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
