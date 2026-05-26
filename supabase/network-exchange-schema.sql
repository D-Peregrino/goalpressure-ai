-- GoalPressure Signal Exchange — rede operacional contextual colaborativa
-- Aplicar após commercial-schema.sql e user-operational-workspace-schema.sql

create table if not exists public.shared_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  fixture_id text not null,
  match_label text not null,
  league text,
  signal_type text not null check (
    signal_type in ('reading', 'context', 'rupture', 'watch')
  ),
  body text not null,
  minute smallint,
  pressure_score smallint,
  gpi_score smallint,
  created_at timestamptz not null default now()
);

create index if not exists shared_signals_fixture_idx
  on public.shared_signals (fixture_id, created_at desc);

create index if not exists shared_signals_user_idx
  on public.shared_signals (user_id, created_at desc);

create table if not exists public.operator_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Operador',
  reputation_score smallint not null default 50 check (reputation_score between 0 and 100),
  precision_score smallint not null default 50,
  anticipation_score smallint not null default 50,
  participation_score smallint not null default 50,
  false_positive_rate smallint not null default 20,
  reliability_score smallint not null default 50,
  signals_count int not null default 0,
  votes_received int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.signal_votes (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references public.shared_signals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  vote text not null check (vote in ('validate', 'useful', 'caution')),
  created_at timestamptz not null default now(),
  unique (signal_id, user_id)
);

create index if not exists signal_votes_signal_idx on public.signal_votes (signal_id);

create table if not exists public.operator_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period text not null default 'rolling',
  precision_score smallint not null default 50,
  anticipation_score smallint not null default 50,
  reliability_score smallint not null default 50,
  rank_position int,
  computed_at timestamptz not null default now(),
  unique (user_id, period)
);

create table if not exists public.collective_context (
  fixture_id text primary key,
  match_label text not null,
  league text,
  observer_count int not null default 0,
  consensus_score smallint not null default 0 check (consensus_score between 0 and 100),
  collective_pressure smallint not null default 0,
  traits jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.network_timeline (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  event_type text not null,
  label text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists network_timeline_fixture_idx
  on public.network_timeline (fixture_id, created_at desc);

alter table public.shared_signals enable row level security;
alter table public.operator_profiles enable row level security;
alter table public.signal_votes enable row level security;
alter table public.operator_scores enable row level security;
alter table public.collective_context enable row level security;
alter table public.network_timeline enable row level security;

-- shared_signals: leitura pública, escrita própria
drop policy if exists shared_signals_select on public.shared_signals;
create policy shared_signals_select on public.shared_signals for select using (true);
drop policy if exists shared_signals_insert on public.shared_signals;
create policy shared_signals_insert on public.shared_signals for insert with check (auth.uid() = user_id);

-- operator_profiles: leitura pública, update próprio via service role
drop policy if exists operator_profiles_select on public.operator_profiles;
create policy operator_profiles_select on public.operator_profiles for select using (true);

-- signal_votes
drop policy if exists signal_votes_select on public.signal_votes;
create policy signal_votes_select on public.signal_votes for select using (true);
drop policy if exists signal_votes_insert on public.signal_votes;
create policy signal_votes_insert on public.signal_votes for insert with check (auth.uid() = user_id);

-- collective + timeline: leitura pública
drop policy if exists collective_context_select on public.collective_context;
create policy collective_context_select on public.collective_context for select using (true);
drop policy if exists network_timeline_select on public.network_timeline;
create policy network_timeline_select on public.network_timeline for select using (true);

drop policy if exists operator_scores_select on public.operator_scores;
create policy operator_scores_select on public.operator_scores for select using (true);
