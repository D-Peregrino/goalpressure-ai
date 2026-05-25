-- Migração v2 — retenção (oportunidades salvas, alertas, atividade, spotlight)
alter table public.user_workspace
  add column if not exists saved_opportunities jsonb not null default '[]'::jsonb;

alter table public.user_workspace
  add column if not exists recent_alerts jsonb not null default '[]'::jsonb;

alter table public.user_workspace
  add column if not exists activity_log jsonb not null default '[]'::jsonb;

alter table public.user_workspace
  add column if not exists spotlight_completed boolean not null default false;
