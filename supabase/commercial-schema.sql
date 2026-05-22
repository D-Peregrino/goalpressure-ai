-- GoalPressure AI — schema comercial (clientes, leads, assinaturas, pagamentos)
-- Aplicar no Supabase SQL Editor após Auth habilitado.

-- ─── Perfis ───────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null,
  phone text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_user_id_idx on public.profiles (user_id);

-- ─── Assinaturas ──────────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'fundador', 'pro', 'elite')),
  status text not null default 'active' check (
    status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete')
  ),
  provider text default 'mock',
  provider_customer_id text,
  provider_subscription_id text,
  coupon_code text,
  original_amount_cents int,
  discount_percent int default 0,
  final_amount_cents int,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists subscriptions_user_id_unique on public.subscriptions (user_id);
create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);
create index if not exists subscriptions_plan_idx on public.subscriptions (plan);

-- ─── Leads ────────────────────────────────────────────────────────────────────
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  phone text,
  source text not null default 'landing',
  interest text,
  status text not null default 'new' check (
    status in ('new', 'contacted', 'qualified', 'trial', 'converted', 'lost')
  ),
  notes text,
  coupon_code text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_email_idx on public.leads (email);
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_source_idx on public.leads (source);
create index if not exists leads_created_at_idx on public.leads (created_at desc);

-- ─── Pagamentos ───────────────────────────────────────────────────────────────
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  provider text not null default 'mock',
  provider_payment_id text,
  amount_cents int not null,
  original_amount_cents int,
  discount_percent int default 0,
  currency text not null default 'BRL',
  status text not null default 'pending' check (
    status in ('pending', 'paid', 'failed', 'refunded')
  ),
  coupon_code text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists payments_user_id_idx on public.payments (user_id);
create index if not exists payments_status_idx on public.payments (status);

-- ─── Eventos ──────────────────────────────────────────────────────────────────
create table if not exists public.customer_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete cascade,
  type text not null,
  description text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists customer_events_user_id_idx on public.customer_events (user_id);
create index if not exists customer_events_lead_id_idx on public.customer_events (lead_id);

-- ─── Notas de suporte ─────────────────────────────────────────────────────────
create table if not exists public.support_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  admin_id uuid references auth.users (id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists support_notes_user_id_idx on public.support_notes (user_id);

-- ─── Trigger updated_at ───────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- ─── Novo usuário → perfil + assinatura free ──────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email
  )
  on conflict (user_id) do nothing;

  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active')
  on conflict do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.leads enable row level security;
alter table public.payments enable row level security;
alter table public.customer_events enable row level security;
alter table public.support_notes enable row level security;

-- Perfis: usuário vê o próprio
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = user_id);

-- Assinaturas: usuário vê a própria
drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
  for select using (auth.uid() = user_id);

-- Pagamentos: usuário vê os próprios
drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments
  for select using (auth.uid() = user_id);

-- Leads: insert público (via service role na API); leitura só admin via service role
drop policy if exists leads_insert_anon on public.leads;
create policy leads_insert_anon on public.leads
  for insert with check (true);

-- Eventos: usuário vê os próprios
drop policy if exists customer_events_select_own on public.customer_events;
create policy customer_events_select_own on public.customer_events
  for select using (auth.uid() = user_id);

-- Notas: usuário vê notas sobre si (sem conteúdo sensível de admin — opcional desabilitar)
drop policy if exists support_notes_select_own on public.support_notes;
create policy support_notes_select_own on public.support_notes
  for select using (auth.uid() = user_id);
