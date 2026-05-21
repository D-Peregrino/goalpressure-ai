-- GoalPressure AI — live runtime schema extensions
-- Apply after supabase/schema.sql

-- ─── Matches: live ingestion columns ────────────────────────────────────────

alter table public.matches
  add column if not exists fixture_id text,
  add column if not exists last_seen_at timestamptz;

update public.matches
set fixture_id = external_id
where fixture_id is null;

create index if not exists matches_last_seen_at_idx
  on public.matches (last_seen_at desc nulls last);

create index if not exists matches_status_idx
  on public.matches (status);

create index if not exists matches_pressure_score_idx
  on public.matches (pressure_score desc);

-- ─── Signals: realtime ingestion columns ────────────────────────────────────

alter table public.signals
  add column if not exists fixture_id text;

update public.signals
set fixture_id = coalesce(external_id, match_id)
where fixture_id is null;

create index if not exists signals_fixture_id_idx on public.signals (fixture_id);
create index if not exists signals_fixture_market_idx
  on public.signals (fixture_id, market, confidence);

-- Dedup support: same fixture + market + confidence within ingestion window
create index if not exists signals_live_dedup_idx
  on public.signals (fixture_id, market, confidence, created_at desc);

-- ─── updated_at trigger for matches ─────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists matches_set_updated_at on public.matches;

create trigger matches_set_updated_at
before update on public.matches
for each row
execute function public.set_updated_at();

-- ─── Runtime telemetry (optional ops mirror) ──────────────────────────────────

create table if not exists public.runtime_cycles (
  id uuid primary key default gen_random_uuid(),
  cycle_started_at timestamptz not null default now(),
  cycle_completed_at timestamptz,
  success boolean not null default false,
  matches_fetched int not null default 0,
  matches_upserted int not null default 0,
  signals_generated int not null default 0,
  signals_persisted int not null default 0,
  duration_ms int,
  error_message text,
  metadata jsonb default '{}'::jsonb
);

create index if not exists runtime_cycles_started_idx
  on public.runtime_cycles (cycle_started_at desc);

-- ─── Live quantitative metrics (pressure engine per cycle) ─────────────────

create table if not exists public.live_metrics (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  home_pressure numeric(5, 2) not null default 0,
  away_pressure numeric(5, 2) not null default 0,
  momentum numeric(5, 2) not null default 0,
  goal_probability numeric(6, 4) not null default 0,
  confidence numeric(6, 4) not null default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists live_metrics_fixture_id_idx
  on public.live_metrics (fixture_id);

create index if not exists live_metrics_created_at_idx
  on public.live_metrics (created_at desc);

create index if not exists live_metrics_fixture_created_idx
  on public.live_metrics (fixture_id, created_at desc);

-- ─── Signal dispatches (decision engine + Telegram outcome) ─────────────────

create table if not exists public.signal_dispatches (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  market text not null,
  pressure_score numeric(5, 2) not null default 0,
  momentum numeric(5, 2) not null default 0,
  goal_probability numeric(6, 4) not null default 0,
  confidence numeric(6, 4) not null default 0,
  ev numeric(8, 4) not null default 0,
  fair_odd numeric(8, 3) not null default 0,
  market_odd numeric(8, 3) not null default 0,
  triggered boolean not null default false,
  telegram_sent boolean not null default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists signal_dispatches_fixture_id_idx
  on public.signal_dispatches (fixture_id);

create index if not exists signal_dispatches_created_at_idx
  on public.signal_dispatches (created_at desc);

create index if not exists signal_dispatches_fixture_market_idx
  on public.signal_dispatches (fixture_id, market, created_at desc);

create index if not exists signal_dispatches_triggered_idx
  on public.signal_dispatches (triggered, created_at desc);

-- ─── Backtest results (institutional validation) ────────────────────────────

create table if not exists public.backtest_results (
  id uuid primary key default gen_random_uuid(),
  strategy text not null,
  market text not null,
  total_signals int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  roi numeric(10, 4) not null default 0,
  yield numeric(10, 4) not null default 0,
  hit_rate numeric(8, 4) not null default 0,
  profit_units numeric(12, 4) not null default 0,
  max_drawdown numeric(10, 4) not null default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists backtest_results_created_at_idx
  on public.backtest_results (created_at desc);

create index if not exists backtest_results_strategy_market_idx
  on public.backtest_results (strategy, market, created_at desc);

-- ─── Market calibration (proprietary vs implied) ─────────────────────────────

create table if not exists public.market_edges (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  market text not null,
  proprietary_probability numeric(8, 4) not null default 0,
  implied_probability numeric(8, 4) not null default 0,
  edge numeric(8, 4) not null default 0,
  edge_percent numeric(8, 3) not null default 0,
  fair_odd numeric(8, 3) not null default 0,
  market_odd numeric(8, 3) not null default 0,
  expected_value numeric(8, 4) not null default 0,
  confidence numeric(6, 4) not null default 0,
  mispricing_score numeric(5, 2) not null default 0,
  classification text not null default 'IGNORE',
  closing_line_delta numeric(8, 4),
  odds_drift numeric(8, 4),
  steam_move boolean not null default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists market_edges_fixture_id_idx
  on public.market_edges (fixture_id);

create index if not exists market_edges_created_at_idx
  on public.market_edges (created_at desc);

create index if not exists market_edges_classification_idx
  on public.market_edges (classification, created_at desc);

create table if not exists public.market_snapshots (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  market text not null,
  snapshot_type text not null default 'live_cycle',
  market_odd numeric(8, 3) not null,
  proprietary_probability numeric(8, 4) not null,
  implied_probability numeric(8, 4) not null,
  edge numeric(8, 4) not null,
  expected_value numeric(8, 4) not null,
  mispricing_score numeric(5, 2) not null default 0,
  closing_line_delta numeric(8, 4),
  odds_drift numeric(8, 4),
  steam_move boolean not null default false,
  sharp_pressure numeric(5, 2),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists market_snapshots_fixture_market_idx
  on public.market_snapshots (fixture_id, market, created_at desc);

create index if not exists market_snapshots_type_idx
  on public.market_snapshots (snapshot_type, created_at desc);

-- ─── Temporal dynamics metrics ──────────────────────────────────────────────

create table if not exists public.temporal_metrics (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  minute int not null default 0,
  match_phase text not null default 'MID',
  temporal_pressure numeric(5, 2) not null default 0,
  urgency_multiplier numeric(6, 3) not null default 1,
  scoring_window_probability numeric(6, 4) not null default 0,
  late_goal_probability numeric(6, 4) not null default 0,
  exhaustion_factor numeric(6, 4) not null default 0,
  chaos_index numeric(5, 2) not null default 0,
  market_lag_factor numeric(6, 4) not null default 0,
  acceleration_score numeric(5, 2) not null default 0,
  volatility_score numeric(5, 2) not null default 0,
  execution_priority text not null default 'LOW',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists temporal_metrics_fixture_id_idx
  on public.temporal_metrics (fixture_id);

create index if not exists temporal_metrics_created_at_idx
  on public.temporal_metrics (created_at desc);

create index if not exists temporal_metrics_priority_idx
  on public.temporal_metrics (execution_priority, created_at desc);

create index if not exists temporal_metrics_chaos_idx
  on public.temporal_metrics (chaos_index desc, created_at desc);

-- ─── Player impact runtime metrics ──────────────────────────────────────────

create table if not exists public.player_runtime_metrics (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  minute int not null default 0,
  offensive_impact numeric(5, 2) not null default 0,
  defensive_impact numeric(5, 2) not null default 0,
  chaos_contribution numeric(5, 2) not null default 0,
  fatigue_impact numeric(5, 2) not null default 0,
  clutch_factor numeric(5, 2) not null default 0,
  goalkeeper_resistance numeric(5, 2) not null default 0,
  substitution_swing numeric(6, 2) not null default 0,
  red_card_impact numeric(5, 2) not null default 0,
  player_volatility numeric(5, 2) not null default 0,
  team_synergy_shift numeric(6, 2) not null default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists player_runtime_metrics_fixture_id_idx
  on public.player_runtime_metrics (fixture_id);

create index if not exists player_runtime_metrics_created_at_idx
  on public.player_runtime_metrics (created_at desc);

create index if not exists player_runtime_metrics_clutch_idx
  on public.player_runtime_metrics (clutch_factor desc, created_at desc);

-- ─── Microevent detection metrics ───────────────────────────────────────────

create table if not exists public.microevent_metrics (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  minute int not null default 0,
  territorial_dominance numeric(5, 2) not null default 0,
  sequence_pressure numeric(5, 2) not null default 0,
  attack_wave_intensity numeric(5, 2) not null default 0,
  chaos_burst numeric(5, 2) not null default 0,
  transition_threat numeric(5, 2) not null default 0,
  flank_overload numeric(5, 2) not null default 0,
  counter_attack_risk numeric(5, 2) not null default 0,
  set_piece_danger numeric(5, 2) not null default 0,
  emotional_tilt numeric(5, 2) not null default 0,
  collapse_probability numeric(5, 2) not null default 0,
  microevent_score numeric(5, 2) not null default 0,
  trigger_window text not null default '300s',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists microevent_metrics_fixture_id_idx
  on public.microevent_metrics (fixture_id);

create index if not exists microevent_metrics_created_at_idx
  on public.microevent_metrics (created_at desc);

create index if not exists microevent_metrics_score_idx
  on public.microevent_metrics (microevent_score desc, created_at desc);

create index if not exists microevent_metrics_trigger_idx
  on public.microevent_metrics (trigger_window, created_at desc);

-- ─── Sequence memory metrics ────────────────────────────────────────────────

create table if not exists public.sequence_memory_metrics (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  minute int not null default 0,
  recurring_pressure_pattern numeric(5, 2) not null default 0,
  pressure_persistence numeric(5, 2) not null default 0,
  offensive_cycle_strength numeric(5, 2) not null default 0,
  collapse_cycle_probability numeric(5, 2) not null default 0,
  emotional_recovery_index numeric(5, 2) not null default 0,
  fake_momentum_probability numeric(5, 2) not null default 0,
  sustained_chaos_level numeric(5, 2) not null default 0,
  defensive_fatigue_curve numeric(5, 2) not null default 0,
  late_game_dominance numeric(5, 2) not null default 0,
  recurrence_score numeric(5, 2) not null default 0,
  memory_confidence numeric(5, 2) not null default 0,
  sequence_state text not null default 'STABLE',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sequence_memory_metrics_fixture_id_idx
  on public.sequence_memory_metrics (fixture_id);

create index if not exists sequence_memory_metrics_created_at_idx
  on public.sequence_memory_metrics (created_at desc);

create index if not exists sequence_memory_metrics_recurrence_idx
  on public.sequence_memory_metrics (recurrence_score desc, created_at desc);

create index if not exists sequence_memory_metrics_state_idx
  on public.sequence_memory_metrics (sequence_state, created_at desc);

-- ─── Meta consensus metrics ───────────────────────────────────────────────────

create table if not exists public.meta_consensus_metrics (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  minute int not null default 0,
  consensus_score numeric(5, 2) not null default 0,
  institutional_confidence numeric(5, 2) not null default 0,
  execution_grade text not null default 'D',
  trigger_approval boolean not null default false,
  market_agreement numeric(5, 2) not null default 0,
  contextual_alignment numeric(5, 2) not null default 0,
  edge_persistence numeric(5, 2) not null default 0,
  volatility_risk numeric(5, 2) not null default 0,
  false_positive_risk numeric(5, 2) not null default 0,
  execution_decision text not null default 'IGNORE',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists meta_consensus_metrics_fixture_id_idx
  on public.meta_consensus_metrics (fixture_id);

create index if not exists meta_consensus_metrics_created_at_idx
  on public.meta_consensus_metrics (created_at desc);

create index if not exists meta_consensus_metrics_score_idx
  on public.meta_consensus_metrics (consensus_score desc, created_at desc);

create index if not exists meta_consensus_metrics_decision_idx
  on public.meta_consensus_metrics (execution_decision, created_at desc);

create index if not exists meta_consensus_metrics_grade_idx
  on public.meta_consensus_metrics (execution_grade, created_at desc);

-- ─── Data quality metrics ─────────────────────────────────────────────────────

create table if not exists public.data_quality_metrics (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  minute int not null default 0,
  data_quality_score numeric(5, 2) not null default 0,
  missing_fields text[] not null default '{}',
  stale_risk numeric(5, 2) not null default 0,
  reliability text not null default 'MEDIUM',
  usable_for_signal boolean not null default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists data_quality_metrics_fixture_id_idx
  on public.data_quality_metrics (fixture_id);

create index if not exists data_quality_metrics_created_at_idx
  on public.data_quality_metrics (created_at desc);

create index if not exists data_quality_metrics_usable_idx
  on public.data_quality_metrics (usable_for_signal, created_at desc);

-- ─── Telegram auto dispatch audit ───────────────────────────────────────────

create table if not exists public.telegram_dispatches (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  match_id text not null,
  market text not null,
  status text not null,
  block_reason text,
  signal_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists telegram_dispatches_fixture_idx
  on public.telegram_dispatches (fixture_id, created_at desc);

create index if not exists telegram_dispatches_status_idx
  on public.telegram_dispatches (status, created_at desc);

-- ─── Live Validation Lab ──────────────────────────────────────────────────────

create table if not exists public.validation_metrics (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  minute int not null default 0,
  validation_score numeric(5, 2) not null default 0,
  false_positive_risk numeric(5, 2) not null default 0,
  reliability text not null default 'MEDIUM',
  segment_tags text[] not null default '{}',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists validation_metrics_fixture_idx
  on public.validation_metrics (fixture_id, created_at desc);

create index if not exists validation_metrics_created_at_idx
  on public.validation_metrics (created_at desc);

create index if not exists validation_metrics_score_idx
  on public.validation_metrics (validation_score desc, created_at desc);

create table if not exists public.validation_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_type text not null default 'live_cycle',
  trade_count int not null default 0,
  hit_rate numeric(8, 4) not null default 0,
  roi numeric(10, 4) not null default 0,
  profit_units numeric(10, 4) not null default 0,
  lab_payload jsonb not null default '{}'::jsonb,
  suggestions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists validation_snapshots_created_at_idx
  on public.validation_snapshots (created_at desc);

create index if not exists validation_snapshots_type_idx
  on public.validation_snapshots (snapshot_type, created_at desc);

-- ─── API usage metrics (SportMonks monitor) ───────────────────────────────────

create table if not exists public.api_usage_metrics (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'sportmonks',
  requests_per_minute numeric(10, 2) not null default 0,
  requests_per_hour numeric(10, 2) not null default 0,
  requests_per_day numeric(10, 2) not null default 0,
  month_projection numeric(12, 2) not null default 0,
  estimated_remaining_quota numeric(12, 2),
  alert_level text not null default 'SAFE',
  active_fixtures int not null default 0,
  polling_frequency_ms int not null default 15000,
  top_endpoints jsonb not null default '[]'::jsonb,
  heatmap jsonb not null default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists api_usage_metrics_created_at_idx
  on public.api_usage_metrics (created_at desc);

create index if not exists api_usage_metrics_alert_idx
  on public.api_usage_metrics (alert_level, created_at desc);

create index if not exists api_usage_metrics_provider_idx
  on public.api_usage_metrics (provider, created_at desc);
