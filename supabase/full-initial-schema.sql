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
