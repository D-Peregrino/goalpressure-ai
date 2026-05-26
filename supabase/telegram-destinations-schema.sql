-- GoalPressure — Telegram Dispatch destinations & delivery logs
-- Idempotente. Aplicar via /api/admin/apply-schemas

create table if not exists public.telegram_destinations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('user', 'group', 'channel')),
  chat_id text not null,
  active boolean not null default true,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists telegram_destinations_chat_id_idx
  on public.telegram_destinations (chat_id);

create index if not exists telegram_destinations_active_idx
  on public.telegram_destinations (active, created_at desc);

create table if not exists public.telegram_dispatch_logs (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid references public.telegram_destinations (id) on delete set null,
  destination_name text,
  chat_id text,
  pipeline text not null default 'unknown',
  alert_type text,
  priority text,
  fixture_id text,
  signal_id text,
  status text not null check (status in ('sent', 'sandbox', 'failed', 'skipped')),
  error_message text,
  message_preview text,
  telegram_message_id text,
  latency_ms integer,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists telegram_dispatch_logs_created_idx
  on public.telegram_dispatch_logs (created_at desc);

create index if not exists telegram_dispatch_logs_status_idx
  on public.telegram_dispatch_logs (status, created_at desc);

create index if not exists telegram_dispatch_logs_destination_idx
  on public.telegram_dispatch_logs (destination_id, created_at desc);
