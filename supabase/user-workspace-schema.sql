-- GoalPressure — workspace do usuário (favoritos, acompanhados, histórico, onboarding)
-- Aplicar após commercial-schema.sql

create table if not exists public.user_workspace (
  user_id uuid primary key references auth.users (id) on delete cascade,
  favorites text[] not null default '{}',
  watched text[] not null default '{}',
  reading_history jsonb not null default '[]'::jsonb,
  recent_opportunities jsonb not null default '[]'::jsonb,
  onboarding_completed boolean not null default false,
  last_route text,
  updated_at timestamptz not null default now()
);

create index if not exists user_workspace_updated_at_idx on public.user_workspace (updated_at desc);

alter table public.user_workspace enable row level security;

drop policy if exists user_workspace_select_own on public.user_workspace;
create policy user_workspace_select_own on public.user_workspace
  for select using (auth.uid() = user_id);

drop policy if exists user_workspace_update_own on public.user_workspace;
create policy user_workspace_update_own on public.user_workspace
  for update using (auth.uid() = user_id);

drop policy if exists user_workspace_insert_own on public.user_workspace;
create policy user_workspace_insert_own on public.user_workspace
  for insert with check (auth.uid() = user_id);
