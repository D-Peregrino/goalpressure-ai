-- GoalPressure — Autonomous Decision Layer
-- Idempotente.

create table if not exists public.autonomous_decisions (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  regime text not null,
  sensitivity text not null,
  thresholds jsonb not null default '{}',
  aggression text not null,
  false_positive_risk numeric not null default 0,
  dispatch_decision text not null,
  autonomous_confidence numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists autonomous_decisions_fixture_idx
  on public.autonomous_decisions (fixture_id, created_at desc);

create index if not exists autonomous_decisions_regime_idx
  on public.autonomous_decisions (regime, created_at desc);
