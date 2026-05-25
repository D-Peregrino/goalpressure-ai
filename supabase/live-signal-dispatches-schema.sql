-- GoalPressure — Execution & Distribution Layer
-- Idempotente.

create table if not exists public.live_signal_dispatches (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  signal_type text not null,
  urgency text not null,
  dispatched_to text not null default '',
  message text not null default '',
  confidence numeric not null default 0,
  ev numeric,
  telegram_sent boolean not null default false,
  push_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists live_signal_dispatches_fixture_idx
  on public.live_signal_dispatches (fixture_id, created_at desc);

create index if not exists live_signal_dispatches_urgency_idx
  on public.live_signal_dispatches (urgency, created_at desc);
