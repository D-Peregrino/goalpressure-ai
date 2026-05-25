-- GoalPressure — Memory & Learning Layer
-- Idempotente.

create table if not exists public.historical_signal_outcomes (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  signal_type text not null,
  market text not null,
  minute int not null default 0,
  pressure_score numeric not null default 0,
  ev numeric,
  confidence numeric not null default 0,
  confidence_class text,
  odd numeric not null default 1,
  outcome text not null,
  final_score text not null default '0-0',
  league text,
  home_team text,
  away_team text,
  temperature text,
  created_at timestamptz not null default now()
);

create index if not exists historical_signal_outcomes_fixture_idx
  on public.historical_signal_outcomes (fixture_id, created_at desc);

create index if not exists historical_signal_outcomes_league_idx
  on public.historical_signal_outcomes (league, created_at desc);

create table if not exists public.league_behavior_profiles (
  league text primary key,
  chaos_score numeric not null default 0,
  conversion_score numeric not null default 0,
  volatility_score numeric not null default 0,
  pressure_reliability numeric not null default 0,
  late_goal_rate numeric not null default 0,
  sample_size int not null default 0,
  label text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.team_behavior_profiles (
  id uuid primary key default gen_random_uuid(),
  team text not null,
  league text not null default '',
  profile_type text not null,
  label text not null default '',
  score numeric not null default 0,
  sample_size int not null default 0,
  updated_at timestamptz not null default now(),
  unique (team, league)
);

create index if not exists team_behavior_profiles_team_idx
  on public.team_behavior_profiles (team, league);

create table if not exists public.engine_weight_recommendations (
  id uuid primary key default gen_random_uuid(),
  current_weights jsonb not null default '{}',
  suggested_weights jsonb not null default '{}',
  rationale text not null default '',
  accuracy_before numeric not null default 0,
  false_positive_rate numeric not null default 0,
  confidence numeric not null default 0,
  status text not null default 'SUGGESTED',
  created_at timestamptz not null default now()
);

create index if not exists engine_weight_recommendations_created_idx
  on public.engine_weight_recommendations (created_at desc);
