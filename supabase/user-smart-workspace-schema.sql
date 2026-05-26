-- GoalPressure — Smart Personalized Workspace
-- Aplicar após user-operational-workspace-schema.sql

create table if not exists public.user_behavior_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null,
  fixture_id text,
  league_id bigint,
  team_id bigint,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_behavior_events_user_created_idx
  on public.user_behavior_events (user_id, created_at desc);

create index if not exists user_behavior_events_type_idx
  on public.user_behavior_events (user_id, event_type);

create table if not exists public.user_operational_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  behavioral_score smallint not null default 50 check (behavioral_score between 0 and 100),
  operational_style text not null default 'explorador'
    check (operational_style in ('agressivo', 'seletivo', 'explorador', 'institucional')),
  live_affinity smallint not null default 50 check (live_affinity between 0 and 100),
  pressure_preference smallint not null default 55 check (pressure_preference between 0 and 100),
  gpi_affinity smallint not null default 50 check (gpi_affinity between 0 and 100),
  telegram_affinity smallint not null default 40 check (telegram_affinity between 0 and 100),
  traits jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_behavior_events enable row level security;
alter table public.user_operational_profiles enable row level security;

drop policy if exists user_behavior_events_select on public.user_behavior_events;
create policy user_behavior_events_select on public.user_behavior_events
  for select using (auth.uid() = user_id);

drop policy if exists user_behavior_events_insert on public.user_behavior_events;
create policy user_behavior_events_insert on public.user_behavior_events
  for insert with check (auth.uid() = user_id);

drop policy if exists user_operational_profiles_select on public.user_operational_profiles;
create policy user_operational_profiles_select on public.user_operational_profiles
  for select using (auth.uid() = user_id);

drop policy if exists user_operational_profiles_insert on public.user_operational_profiles;
create policy user_operational_profiles_insert on public.user_operational_profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists user_operational_profiles_update on public.user_operational_profiles;
create policy user_operational_profiles_update on public.user_operational_profiles
  for update using (auth.uid() = user_id);
