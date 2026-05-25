-- GoalPressure — snapshots históricos da engine de pressão ofensiva
-- Idempotente.

create table if not exists public.live_pressure_snapshots (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  minute integer not null default 0,
  pressure_score numeric not null default 0,
  momentum_score numeric not null default 0,
  territorial_score numeric not null default 0,
  acceleration_score numeric not null default 0,
  signal_type text,
  signal_strength numeric,
  stats_json jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists live_pressure_snapshots_fixture_created_idx
  on public.live_pressure_snapshots (fixture_id, created_at desc);

create index if not exists live_pressure_snapshots_fixture_minute_idx
  on public.live_pressure_snapshots (fixture_id, minute desc);
