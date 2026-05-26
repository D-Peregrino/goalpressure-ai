-- GoalPressure — workspace operacional do usuário
-- Aplicar após commercial-schema.sql e user-workspace-schema.sql

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Watchlist operacional (partidas em acompanhamento ativo)
create table if not exists public.user_watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  fixture_id text not null,
  match_label text,
  note text,
  priority smallint not null default 0 check (priority between 0 and 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, fixture_id)
);

create index if not exists user_watchlists_user_idx on public.user_watchlists (user_id, updated_at desc);

-- Times favoritos
create table if not exists public.user_favorite_teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  team_id bigint not null,
  team_name text not null,
  logo_path text,
  league_name text,
  created_at timestamptz not null default now(),
  unique (user_id, team_id)
);

create index if not exists user_favorite_teams_user_idx on public.user_favorite_teams (user_id, created_at desc);

-- Ligas favoritas
create table if not exists public.user_favorite_leagues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  league_id bigint not null,
  league_name text not null,
  country text,
  created_at timestamptz not null default now(),
  unique (user_id, league_id)
);

create index if not exists user_favorite_leagues_user_idx on public.user_favorite_leagues (user_id, created_at desc);

-- Histórico de alertas do usuário
create table if not exists public.user_alert_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  fixture_id text,
  match_label text,
  alert_type text not null default 'context',
  message text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_alert_history_user_idx on public.user_alert_history (user_id, created_at desc);

-- Preferências do workspace
create table if not exists public.user_workspace_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  default_view text not null default 'overview',
  compact_mode boolean not null default false,
  telegram_digest boolean not null default true,
  show_daily_summary boolean not null default true,
  pinned_sections jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists user_watchlists_updated_at on public.user_watchlists;
create trigger user_watchlists_updated_at
  before update on public.user_watchlists
  for each row execute function public.set_updated_at();

drop trigger if exists user_workspace_preferences_updated_at on public.user_workspace_preferences;
create trigger user_workspace_preferences_updated_at
  before update on public.user_workspace_preferences
  for each row execute function public.set_updated_at();

alter table public.user_watchlists enable row level security;
alter table public.user_favorite_teams enable row level security;
alter table public.user_favorite_leagues enable row level security;
alter table public.user_alert_history enable row level security;
alter table public.user_workspace_preferences enable row level security;

-- watchlists
drop policy if exists user_watchlists_select on public.user_watchlists;
create policy user_watchlists_select on public.user_watchlists for select using (auth.uid() = user_id);
drop policy if exists user_watchlists_insert on public.user_watchlists;
create policy user_watchlists_insert on public.user_watchlists for insert with check (auth.uid() = user_id);
drop policy if exists user_watchlists_update on public.user_watchlists;
create policy user_watchlists_update on public.user_watchlists for update using (auth.uid() = user_id);
drop policy if exists user_watchlists_delete on public.user_watchlists;
create policy user_watchlists_delete on public.user_watchlists for delete using (auth.uid() = user_id);

-- teams
drop policy if exists user_favorite_teams_select on public.user_favorite_teams;
create policy user_favorite_teams_select on public.user_favorite_teams for select using (auth.uid() = user_id);
drop policy if exists user_favorite_teams_insert on public.user_favorite_teams;
create policy user_favorite_teams_insert on public.user_favorite_teams for insert with check (auth.uid() = user_id);
drop policy if exists user_favorite_teams_delete on public.user_favorite_teams;
create policy user_favorite_teams_delete on public.user_favorite_teams for delete using (auth.uid() = user_id);

-- leagues
drop policy if exists user_favorite_leagues_select on public.user_favorite_leagues;
create policy user_favorite_leagues_select on public.user_favorite_leagues for select using (auth.uid() = user_id);
drop policy if exists user_favorite_leagues_insert on public.user_favorite_leagues;
create policy user_favorite_leagues_insert on public.user_favorite_leagues for insert with check (auth.uid() = user_id);
drop policy if exists user_favorite_leagues_delete on public.user_favorite_leagues;
create policy user_favorite_leagues_delete on public.user_favorite_leagues for delete using (auth.uid() = user_id);

-- alerts
drop policy if exists user_alert_history_select on public.user_alert_history;
create policy user_alert_history_select on public.user_alert_history for select using (auth.uid() = user_id);
drop policy if exists user_alert_history_insert on public.user_alert_history;
create policy user_alert_history_insert on public.user_alert_history for insert with check (auth.uid() = user_id);
drop policy if exists user_alert_history_update on public.user_alert_history;
create policy user_alert_history_update on public.user_alert_history for update using (auth.uid() = user_id);

-- preferences
drop policy if exists user_workspace_preferences_select on public.user_workspace_preferences;
create policy user_workspace_preferences_select on public.user_workspace_preferences for select using (auth.uid() = user_id);
drop policy if exists user_workspace_preferences_insert on public.user_workspace_preferences;
create policy user_workspace_preferences_insert on public.user_workspace_preferences for insert with check (auth.uid() = user_id);
drop policy if exists user_workspace_preferences_update on public.user_workspace_preferences;
create policy user_workspace_preferences_update on public.user_workspace_preferences for update using (auth.uid() = user_id);
