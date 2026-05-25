-- GoalPressure — sinais EV live (fair odds, distorção, confiança)
-- Idempotente.

create table if not exists public.live_ev_signals (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  market_type text not null,
  probability numeric not null default 0,
  fair_odds numeric not null default 1,
  market_odds numeric not null default 1,
  expected_value numeric not null default 0,
  distortion_level text,
  confidence_score numeric not null default 0,
  engine_score numeric not null default 0,
  signal_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists live_ev_signals_fixture_created_idx
  on public.live_ev_signals (fixture_id, created_at desc);

create index if not exists live_ev_signals_ev_idx
  on public.live_ev_signals (expected_value desc, created_at desc);
