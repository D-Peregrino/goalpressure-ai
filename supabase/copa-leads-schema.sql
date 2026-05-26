-- GoalPressure Copa 2026 — captura de leads (Telegram / alertas)

create table if not exists public.copa_leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  telegram text,
  source text not null default 'copa',
  created_at timestamptz not null default now()
);

create index if not exists copa_leads_email_idx on public.copa_leads (email);
create index if not exists copa_leads_source_idx on public.copa_leads (source);
create index if not exists copa_leads_created_idx on public.copa_leads (created_at desc);
