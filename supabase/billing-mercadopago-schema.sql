-- GoalPressure AI — Billing (plans + billing_events) + Mercado Pago extensions
-- Idempotente. Aplicar via /api/admin/apply-schemas

-- ─── Plans catalog ───────────────────────────────────────────────────────────
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tier text not null default 'free' check (tier in ('free', 'founder', 'pro', 'ops')),
  price_cents int not null default 0,
  currency text not null default 'BRL',
  active boolean not null default true,
  features text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plans_active_idx on public.plans (active, created_at desc);

-- ─── Billing events (audit trail) ────────────────────────────────────────────
create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  payment_id uuid references public.payments (id) on delete set null,
  provider text not null default 'mercado_pago',
  event_type text not null,
  status text,
  provider_event_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists billing_events_created_idx on public.billing_events (created_at desc);
create index if not exists billing_events_user_idx on public.billing_events (user_id, created_at desc);
create index if not exists billing_events_provider_event_idx on public.billing_events (provider, provider_event_id);

-- ─── Extend subscriptions/payments for Mercado Pago recurring ────────────────
do $$
begin
  -- Add ops plan option to existing constraint if table already exists.
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'subscriptions'
  ) then
    -- Expand plan enum (adds ops without breaking existing).
    begin
      alter table public.subscriptions drop constraint if exists subscriptions_plan_check;
      alter table public.subscriptions
        add constraint subscriptions_plan_check
        check (plan in ('free', 'fundador', 'pro', 'elite', 'ops'));
    exception when others then
      -- Ignore if constraint name differs or no permission.
      null;
    end;

    -- Add column to store provider plan reference (preapproval_plan_id) and mp status
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'provider_plan_id'
    ) then
      alter table public.subscriptions add column provider_plan_id text;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'canceled_at'
    ) then
      alter table public.subscriptions add column canceled_at timestamptz;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'paused_at'
    ) then
      alter table public.subscriptions add column paused_at timestamptz;
    end if;
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'payments'
  ) then
    begin
      alter table public.payments drop constraint if exists payments_status_check;
      alter table public.payments
        add constraint payments_status_check
        check (status in ('pending', 'paid', 'failed', 'refunded'));
    exception when others then
      null;
    end;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'payments' and column_name = 'provider_subscription_id'
    ) then
      alter table public.payments add column provider_subscription_id text;
    end if;
  end if;
end $$;

