-- GoalPressure AI — Stripe SaaS (subscription_plans + user_subscriptions)
-- Idempotente. Aplicar via /api/admin/apply-schemas

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  monthly_price int not null default 0,
  yearly_price int not null default 0,
  features jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists subscription_plans_active_idx on public.subscription_plans (active, slug);

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  plan_slug text not null default 'free',
  status text not null default 'inactive' check (
    status in (
      'inactive',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'incomplete',
      'unpaid'
    )
  ),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  coupon_code text,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_subscriptions_user_id_unique on public.user_subscriptions (user_id);
create index if not exists user_subscriptions_status_idx on public.user_subscriptions (status);
create index if not exists user_subscriptions_plan_idx on public.user_subscriptions (plan_slug);

create table if not exists public.subscription_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_subscription_id uuid references public.user_subscriptions (id) on delete set null,
  stripe_invoice_id text unique,
  amount_cents int not null default 0,
  currency text not null default 'brl',
  status text not null default 'open',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists subscription_invoices_user_idx on public.subscription_invoices (user_id, created_at desc);

-- Seed planos oficiais
insert into public.subscription_plans (slug, name, monthly_price, yearly_price, features, active)
values
  (
    'free',
    'Free',
    0,
    0,
    '["landing","demo"]'::jsonb,
    true
  ),
  (
    'starter',
    'Starter',
    4900,
    47000,
    '["terminal","gpi","workspace"]'::jsonb,
    true
  ),
  (
    'pro',
    'Pro',
    9700,
    97000,
    '["terminal","gpi","replay","telegram_alerts","copa_premium","workspace","timeline"]'::jsonb,
    true
  ),
  (
    'founder',
    'Founder',
    4900,
    47000,
    '["terminal","gpi","replay","ops_center","telegram_alerts","copa_premium","network_exchange","quant_dashboard"]'::jsonb,
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  monthly_price = excluded.monthly_price,
  yearly_price = excluded.yearly_price,
  features = excluded.features,
  active = excluded.active;
