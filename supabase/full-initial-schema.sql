-- =============================================================================
-- GoalPressure AI — Full initial Supabase schema (PostgreSQL)
-- =============================================================================
-- Idempotent bootstrap for fresh projects. Safe to re-run (IF NOT EXISTS).
-- Covers: live ingestion, signals, analytics, runtime telemetry, dispatch,
-- research A/B, and model voting.
--
-- Fresh install: run THIS file only.
-- Existing project: see migration order at bottom of file.
-- =============================================================================

-- ─── Extensions ─────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ─── Shared triggers ────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- MATCHES — live fixture snapshots (SportMonks ingestion)
-- =============================================================================

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  external_id text not null,
  fixture_id text,
  home_team text not null,
  away_team text not null,
  league text,
  minute int not null default 0,
  status text not null default 'LIVE',
  pressure_score numeric(6, 2),
  score jsonb default '{}'::jsonb,
  stats jsonb default '{}'::jsonb,
  odds jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz
);

-- Upsert target for liveMatchPersistence / cloudPersistence
alter table public.matches
  drop constraint if exists matches_external_id_key;

alter table public.matches
  add constraint matches_external_id_key unique (external_id);

create index if not exists matches_fixture_id_idx
  on public.matches (fixture_id);

create index if not exists matches_status_idx
  on public.matches (status);

create index if not exists matches_pressure_score_idx
  on public.matches (pressure_score desc nulls last);

create index if not exists matches_updated_at_idx
  on public.matches (updated_at desc);

create index if not exists matches_last_seen_at_idx
  on public.matches (last_seen_at desc nulls last);

create index if not exists matches_live_lookup_idx
  on public.matches (status, last_seen_at desc nulls last);

drop trigger if exists matches_set_updated_at on public.matches;

create trigger matches_set_updated_at
before update on public.matches
for each row
execute function public.set_updated_at();

-- =============================================================================
-- SIGNALS — production & historical signal records
-- =============================================================================

create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  signal_id text not null,
  fixture_id text,
  model_id text,
  match_id text,
  external_id text,
  market text not null,
  confidence text not null,
  pressure numeric(6, 2) not null,
  odd numeric(8, 4) not null,
  roi numeric(10, 4),
  outcome text,
  status text default 'PENDING',
  stake numeric(6, 2),
  home_team text,
  away_team text,
  league text,
  trigger_minute int,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.signals
  drop constraint if exists signals_signal_id_key;

alter table public.signals
  add constraint signals_signal_id_key unique (signal_id);

create index if not exists signals_created_at_idx
  on public.signals (created_at desc);

create index if not exists signals_fixture_id_idx
  on public.signals (fixture_id);

create index if not exists signals_model_id_idx
  on public.signals (model_id);

create index if not exists signals_market_idx
  on public.signals (market);

create index if not exists signals_outcome_idx
  on public.signals (outcome);

create index if not exists signals_fixture_market_idx
  on public.signals (fixture_id, market, confidence);

-- Live dedup window: same fixture + market + confidence within ~90s ingestion
create index if not exists signals_live_dedup_idx
  on public.signals (fixture_id, market, confidence, created_at desc);

create index if not exists signals_pending_idx
  on public.signals (status, created_at desc)
  where outcome is null;

-- =============================================================================
-- ANALYTICS_SNAPSHOTS — aggregated pipeline JSON payloads
-- =============================================================================

create table if not exists public.analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_type text not null default 'summary',
  model_id text,
  payload jsonb not null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists analytics_snapshots_generated_at_idx
  on public.analytics_snapshots (generated_at desc);

create index if not exists analytics_snapshots_type_idx
  on public.analytics_snapshots (snapshot_type, generated_at desc);

drop trigger if exists analytics_snapshots_set_updated_at on public.analytics_snapshots;

create trigger analytics_snapshots_set_updated_at
before update on public.analytics_snapshots
for each row
execute function public.set_updated_at();

-- =============================================================================
-- RUNTIME_CYCLES — live polling engine telemetry
-- =============================================================================

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
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists runtime_cycles_started_idx
  on public.runtime_cycles (cycle_started_at desc);

create index if not exists runtime_cycles_success_idx
  on public.runtime_cycles (success, cycle_started_at desc);

drop trigger if exists runtime_cycles_set_updated_at on public.runtime_cycles;

create trigger runtime_cycles_set_updated_at
before update on public.runtime_cycles
for each row
execute function public.set_updated_at();

-- =============================================================================
-- LIVE_METRICS — quantitative pressure engine (per polling cycle)
-- =============================================================================

create table if not exists public.live_metrics (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  home_pressure numeric(5, 2) not null default 0,
  away_pressure numeric(5, 2) not null default 0,
  momentum numeric(5, 2) not null default 0,
  goal_probability numeric(6, 4) not null default 0,
  confidence numeric(6, 4) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists live_metrics_fixture_id_idx
  on public.live_metrics (fixture_id);

create index if not exists live_metrics_created_at_idx
  on public.live_metrics (created_at desc);

create index if not exists live_metrics_fixture_created_idx
  on public.live_metrics (fixture_id, created_at desc);

-- =============================================================================
-- SIGNAL_DISPATCHES — EV+ decision engine outcomes
-- =============================================================================

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
  metadata jsonb not null default '{}'::jsonb,
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

-- =============================================================================
-- BACKTEST_RESULTS — institutional signal validation
-- =============================================================================

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
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists backtest_results_created_at_idx
  on public.backtest_results (created_at desc);

create index if not exists backtest_results_strategy_market_idx
  on public.backtest_results (strategy, market, created_at desc);

-- =============================================================================
-- MARKET_EDGES / MARKET_SNAPSHOTS — proprietary vs implied calibration
-- =============================================================================

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
  metadata jsonb not null default '{}'::jsonb,
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
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists market_snapshots_fixture_market_idx
  on public.market_snapshots (fixture_id, market, created_at desc);

create index if not exists market_snapshots_type_idx
  on public.market_snapshots (snapshot_type, created_at desc);

-- =============================================================================
-- TEMPORAL_METRICS — game-phase offensive & market dynamics
-- =============================================================================

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
  metadata jsonb not null default '{}'::jsonb,
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

-- =============================================================================
-- PLAYER_RUNTIME_METRICS — individual player impact (live cycle)
-- =============================================================================

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
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists player_runtime_metrics_fixture_id_idx
  on public.player_runtime_metrics (fixture_id);

create index if not exists player_runtime_metrics_created_at_idx
  on public.player_runtime_metrics (created_at desc);

create index if not exists player_runtime_metrics_clutch_idx
  on public.player_runtime_metrics (clutch_factor desc, created_at desc);

-- =============================================================================
-- MICROEVENT_METRICS — offensive micro-patterns & pre-goal windows
-- =============================================================================

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
  metadata jsonb not null default '{}'::jsonb,
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

-- =============================================================================
-- SEQUENCE_MEMORY_METRICS — contextual temporal match memory
-- =============================================================================

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
  metadata jsonb not null default '{}'::jsonb,
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

-- =============================================================================
-- META_CONSENSUS_METRICS — orchestrated institutional decision layer
-- =============================================================================

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
  metadata jsonb not null default '{}'::jsonb,
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

-- =============================================================================
-- DATA_QUALITY_METRICS — fixture reliability for signal gating
-- =============================================================================

create table if not exists public.data_quality_metrics (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  minute int not null default 0,
  data_quality_score numeric(5, 2) not null default 0,
  missing_fields text[] not null default '{}',
  stale_risk numeric(5, 2) not null default 0,
  reliability text not null default 'MEDIUM',
  usable_for_signal boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists data_quality_metrics_fixture_id_idx
  on public.data_quality_metrics (fixture_id);

create index if not exists data_quality_metrics_created_at_idx
  on public.data_quality_metrics (created_at desc);

create index if not exists data_quality_metrics_usable_idx
  on public.data_quality_metrics (usable_for_signal, created_at desc);

-- =============================================================================
-- TELEGRAM_DISPATCHES — auto dispatch controller audit trail
-- =============================================================================

create table if not exists public.telegram_dispatches (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  match_id text not null,
  market text not null,
  status text not null,
  block_reason text,
  signal_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists telegram_dispatches_fixture_idx
  on public.telegram_dispatches (fixture_id, created_at desc);

create index if not exists telegram_dispatches_status_idx
  on public.telegram_dispatches (status, created_at desc);

-- =============================================================================
-- VALIDATION_METRICS — per-fixture live validation scores
-- =============================================================================

create table if not exists public.validation_metrics (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  minute int not null default 0,
  validation_score numeric(5, 2) not null default 0,
  false_positive_risk numeric(5, 2) not null default 0,
  reliability text not null default 'MEDIUM',
  segment_tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists validation_metrics_fixture_idx
  on public.validation_metrics (fixture_id, created_at desc);

create index if not exists validation_metrics_created_at_idx
  on public.validation_metrics (created_at desc);

create index if not exists validation_metrics_score_idx
  on public.validation_metrics (validation_score desc, created_at desc);

-- =============================================================================
-- VALIDATION_SNAPSHOTS — aggregated lab payload per cycle
-- =============================================================================

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

-- =============================================================================
-- API_USAGE_METRICS — SportMonks consumption monitor
-- =============================================================================

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
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists api_usage_metrics_created_at_idx
  on public.api_usage_metrics (created_at desc);

create index if not exists api_usage_metrics_alert_idx
  on public.api_usage_metrics (alert_level, created_at desc);

create index if not exists api_usage_metrics_provider_idx
  on public.api_usage_metrics (provider, created_at desc);

-- =============================================================================
-- DISPATCH_LOGS — Telegram / notification dispatch observability
-- =============================================================================

create table if not exists public.dispatch_logs (
  id uuid primary key default gen_random_uuid(),
  dispatch_id text not null,
  signal_id text not null,
  model_id text not null,
  source text not null default 'production',
  match_id text not null,
  fixture_id text,
  market text not null,
  status text not null default 'queued',
  latency_ms int,
  error_message text,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  dispatched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dispatch_logs
  drop constraint if exists dispatch_logs_dispatch_id_key;

alter table public.dispatch_logs
  add constraint dispatch_logs_dispatch_id_key unique (dispatch_id);

create index if not exists dispatch_logs_dispatched_at_idx
  on public.dispatch_logs (dispatched_at desc);

create index if not exists dispatch_logs_signal_id_idx
  on public.dispatch_logs (signal_id);

create index if not exists dispatch_logs_status_idx
  on public.dispatch_logs (status, dispatched_at desc);

create index if not exists dispatch_logs_model_source_idx
  on public.dispatch_logs (model_id, source, dispatched_at desc);

drop trigger if exists dispatch_logs_set_updated_at on public.dispatch_logs;

create trigger dispatch_logs_set_updated_at
before update on public.dispatch_logs
for each row
execute function public.set_updated_at();

-- =============================================================================
-- MODEL_VOTES — quantitative research / A-B model preference votes
-- =============================================================================

create table if not exists public.model_votes (
  id uuid primary key default gen_random_uuid(),
  vote_id text not null,
  model_id text not null,
  compared_model_id text,
  fixture_id text,
  match_id text,
  market text,
  vote text not null default 'prefer',
  score numeric(6, 2),
  voter_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.model_votes
  drop constraint if exists model_votes_vote_id_key;

alter table public.model_votes
  add constraint model_votes_vote_id_key unique (vote_id);

-- One vote per voter + model + fixture + market (research dedup)
alter table public.model_votes
  drop constraint if exists model_votes_voter_fixture_market_uidx;

alter table public.model_votes
  add constraint model_votes_voter_fixture_market_uidx
  unique (voter_key, model_id, fixture_id, market);

create index if not exists model_votes_model_id_idx
  on public.model_votes (model_id, created_at desc);

create index if not exists model_votes_fixture_idx
  on public.model_votes (fixture_id, created_at desc);

create index if not exists model_votes_vote_idx
  on public.model_votes (vote, created_at desc);

drop trigger if exists model_votes_set_updated_at on public.model_votes;

create trigger model_votes_set_updated_at
before update on public.model_votes
for each row
execute function public.set_updated_at();

-- =============================================================================
-- RESEARCH_SNAPSHOTS — experimental engine & model comparison archives
-- =============================================================================

create table if not exists public.research_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_key text not null,
  snapshot_type text not null,
  model_id text,
  payload jsonb not null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.research_snapshots
  drop constraint if exists research_snapshots_snapshot_key_key;

alter table public.research_snapshots
  add constraint research_snapshots_snapshot_key_key unique (snapshot_key);

create index if not exists research_snapshots_type_idx
  on public.research_snapshots (snapshot_type, generated_at desc);

create index if not exists research_snapshots_model_idx
  on public.research_snapshots (model_id, generated_at desc);

create index if not exists research_snapshots_generated_at_idx
  on public.research_snapshots (generated_at desc);

drop trigger if exists research_snapshots_set_updated_at on public.research_snapshots;

create trigger research_snapshots_set_updated_at
before update on public.research_snapshots
for each row
execute function public.set_updated_at();

-- =============================================================================
-- Backfill helpers (safe on re-run)
-- =============================================================================

update public.matches
set fixture_id = external_id
where fixture_id is null;

update public.signals
set fixture_id = coalesce(fixture_id, external_id, match_id, signal_id)
where fixture_id is null or fixture_id = '';

update public.signals
set external_id = fixture_id
where external_id is null and fixture_id is not null;

-- =============================================================================
-- MIGRATION EXECUTION ORDER
-- =============================================================================
--
-- A) FRESH SUPABASE PROJECT (recommended)
--    1. supabase/full-initial-schema.sql   ← this file (everything)
--
-- B) EXISTING PROJECT (created with older partial migrations)
--    1. supabase/schema.sql                ← legacy base (if never applied)
--    2. supabase/live-runtime-schema.sql   ← live ingestion extensions
--    3. supabase/full-initial-schema.sql   ← idempotent merge (fills gaps)
--
--    OR skip 1–2 and run only full-initial-schema.sql if tables are missing.
--
-- C) DO NOT run full-initial-schema.sql before dropping broken partial tables
--    if you have conflicting constraints. For greenfield, use (A) only.
--
-- D) After SQL apply:
--    - Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in Railway/Vercel
--    - Hit GET /api/health (production auto-starts runtime)
--    - Verify GET /api/runtime/status
--
-- E) Legacy note: cloudPersistence still dual-writes to public.ops_logs when
--    that table exists (schema.sql). dispatch_logs is the canonical Telegram
--    dispatch table for new installs. Both can coexist.
-- =============================================================================
