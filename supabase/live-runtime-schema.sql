-- GoalPressure AI — live runtime schema extensions
-- Apply after supabase/schema.sql

-- ─── Matches: live ingestion columns ────────────────────────────────────────

alter table public.matches
  add column if not exists fixture_id text,
  add column if not exists last_seen_at timestamptz;

update public.matches
set fixture_id = external_id
where fixture_id is null;

create index if not exists matches_last_seen_at_idx
  on public.matches (last_seen_at desc nulls last);

create index if not exists matches_status_idx
  on public.matches (status);

create index if not exists matches_pressure_score_idx
  on public.matches (pressure_score desc);

-- ─── Signals: realtime ingestion columns ────────────────────────────────────

alter table public.signals
  add column if not exists fixture_id text;

update public.signals
set fixture_id = coalesce(external_id, match_id)
where fixture_id is null;

create index if not exists signals_fixture_id_idx on public.signals (fixture_id);
create index if not exists signals_fixture_market_idx
  on public.signals (fixture_id, market, confidence);

-- Dedup support: same fixture + market + confidence within ingestion window
create index if not exists signals_live_dedup_idx
  on public.signals (fixture_id, market, confidence, created_at desc);

-- ─── updated_at trigger for matches ─────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists matches_set_updated_at on public.matches;

create trigger matches_set_updated_at
before update on public.matches
for each row
execute function public.set_updated_at();

-- ─── Runtime telemetry (optional ops mirror) ──────────────────────────────────

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
  metadata jsonb default '{}'::jsonb
);

create index if not exists runtime_cycles_started_idx
  on public.runtime_cycles (cycle_started_at desc);

-- ─── Live quantitative metrics (pressure engine per cycle) ─────────────────

create table if not exists public.live_metrics (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  home_pressure numeric(5, 2) not null default 0,
  away_pressure numeric(5, 2) not null default 0,
  momentum numeric(5, 2) not null default 0,
  goal_probability numeric(6, 4) not null default 0,
  confidence numeric(6, 4) not null default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists live_metrics_fixture_id_idx
  on public.live_metrics (fixture_id);

create index if not exists live_metrics_created_at_idx
  on public.live_metrics (created_at desc);

create index if not exists live_metrics_fixture_created_idx
  on public.live_metrics (fixture_id, created_at desc);
