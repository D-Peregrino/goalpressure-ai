-- GoalPressure — persistência histórica contextual (snapshots, leituras, alertas, outcomes)
-- Idempotente. Aplicar via apply-schemas ou SQL Editor.

create table if not exists public.live_match_snapshots (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  minute integer not null default 0,
  league text,
  home_team text,
  away_team text,
  status text,
  pressure_score numeric not null default 0,
  momentum_score numeric not null default 0,
  score_json jsonb default '{}'::jsonb,
  stats_json jsonb default '{}'::jsonb,
  metadata_json jsonb default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);

create unique index if not exists live_match_snapshots_fixture_minute_uidx
  on public.live_match_snapshots (fixture_id, minute);

create index if not exists live_match_snapshots_recorded_idx
  on public.live_match_snapshots (recorded_at desc);

create table if not exists public.contextual_readings (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  minute integer not null default 0,
  context_score numeric not null default 0,
  context_level text not null,
  alert_level text,
  status_operacional text,
  narrative text,
  badges_json jsonb default '[]'::jsonb,
  metadata_json jsonb default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);

create unique index if not exists contextual_readings_fixture_minute_uidx
  on public.contextual_readings (fixture_id, minute);

create index if not exists contextual_readings_recorded_idx
  on public.contextual_readings (recorded_at desc);

create table if not exists public.predictive_history (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  minute integer not null default 0,
  predictive_level text not null,
  break_probability numeric not null default 0,
  market_lag_score numeric not null default 0,
  goal_pressure_probability numeric not null default 0,
  narrative text,
  metadata_json jsonb default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);

create unique index if not exists predictive_history_fixture_minute_uidx
  on public.predictive_history (fixture_id, minute);

create index if not exists predictive_history_recorded_idx
  on public.predictive_history (recorded_at desc);

create table if not exists public.autonomous_alerts (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  minute integer not null default 0,
  alert_kind text not null,
  priority text not null,
  headline text,
  narrative text,
  context_score numeric not null default 0,
  alert_fingerprint text not null,
  metadata_json jsonb default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);

create unique index if not exists autonomous_alerts_fixture_fingerprint_uidx
  on public.autonomous_alerts (fixture_id, alert_fingerprint);

create index if not exists autonomous_alerts_recorded_idx
  on public.autonomous_alerts (recorded_at desc);

create table if not exists public.match_outcomes (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  league text,
  home_team text,
  away_team text,
  final_score text not null,
  goals_total integer not null default 0,
  finished_at timestamptz,
  outcome_source text default 'live_pipeline',
  metadata_json jsonb default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);

create unique index if not exists match_outcomes_fixture_uidx
  on public.match_outcomes (fixture_id);

create index if not exists match_outcomes_recorded_idx
  on public.match_outcomes (recorded_at desc);
