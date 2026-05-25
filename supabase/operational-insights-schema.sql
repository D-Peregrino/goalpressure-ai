-- GoalPressure — inteligência operacional contextual (game state, narrativa, risco)
-- Idempotente.

create table if not exists public.operational_insights (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  game_state text not null,
  pressure_pattern text not null,
  tactical_scenario text not null default '',
  chaos_level numeric not null default 0,
  temperature text not null,
  risk_context text not null,
  narrative text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists operational_insights_fixture_created_idx
  on public.operational_insights (fixture_id, created_at desc);

create index if not exists operational_insights_temperature_idx
  on public.operational_insights (temperature, created_at desc);
