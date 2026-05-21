-- GoalPressure AI — initial cloud schema (Supabase / PostgreSQL)
-- Run in Supabase SQL Editor or via CLI migration.

-- ─── Signals (historical outcome records) ───────────────────────────────────

create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  signal_id text not null unique,
  model_id text,
  match_id text,
  external_id text,
  market text not null,
  confidence text not null,
  pressure numeric(6, 2) not null,
  odd numeric(8, 4) not null,
  roi numeric(10, 4),
  outcome text,
  status text,
  stake numeric(6, 2),
  home_team text,
  away_team text,
  league text,
  trigger_minute int,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists signals_created_at_idx on public.signals (created_at desc);
create index if not exists signals_model_id_idx on public.signals (model_id);
create index if not exists signals_outcome_idx on public.signals (outcome);

-- ─── Matches (live fixture snapshots) ─────────────────────────────────────

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  external_id text not null,
  home_team text not null,
  away_team text not null,
  league text,
  minute int default 0,
  pressure_score numeric(6, 2),
  status text,
  score jsonb,
  stats jsonb,
  odds jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists matches_external_id_uidx on public.matches (external_id);
create index if not exists matches_updated_at_idx on public.matches (updated_at desc);

-- ─── Ops logs (Telegram dispatch & operational telemetry) ─────────────────

create table if not exists public.ops_logs (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  message text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ops_logs_created_at_idx on public.ops_logs (created_at desc);
create index if not exists ops_logs_event_idx on public.ops_logs (event);

-- ─── Analytics snapshots (aggregated JSON payloads) ───────────────────────

create table if not exists public.analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  generated_at timestamptz not null default now()
);

create index if not exists analytics_snapshots_generated_at_idx
  on public.analytics_snapshots (generated_at desc);
