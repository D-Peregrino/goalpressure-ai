-- GoalPressure AI — eventos operacionais para feed / seed (idempotente)
-- Aplicar antes de npm run seed se a tabela não existir.

create table if not exists public.operational_events (
  id uuid primary key default gen_random_uuid(),
  fixture_id text,
  home_team text,
  away_team text,
  league text,
  event_type text not null,
  headline text not null,
  narrative text,
  severity text not null default 'info' check (
    severity in ('info', 'watch', 'hot', 'critical')
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists operational_events_created_at_idx
  on public.operational_events (created_at desc);

create index if not exists operational_events_fixture_idx
  on public.operational_events (fixture_id, created_at desc);

create index if not exists operational_events_type_idx
  on public.operational_events (event_type, created_at desc);
