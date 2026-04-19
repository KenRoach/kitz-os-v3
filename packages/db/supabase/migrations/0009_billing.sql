-- M14 Billing: subscriptions + battery state + ledger
-- Subscriptions are a 1-to-1 sidecar to tenants. Battery is the live
-- balance, ledger is the append-only audit trail (every topup/debit).

create table if not exists public.billing_subscriptions (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','starter','pro')),
  status text not null default 'active' check (status in ('active','cancelled','past_due')),
  current_period_end timestamptz,
  external_customer_id text,
  external_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_batteries (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  lifetime_topup integer not null default 0 check (lifetime_topup >= 0),
  lifetime_debit integer not null default 0 check (lifetime_debit >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_ledger (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  delta integer not null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists billing_ledger_tenant_created_idx
  on public.billing_ledger (tenant_id, created_at desc);

alter table public.billing_subscriptions enable row level security;
alter table public.billing_batteries enable row level security;
alter table public.billing_ledger enable row level security;

-- All members can read their tenant's billing surface.
create policy billing_sub_member_read on public.billing_subscriptions
  for select
  using (
    exists (
      select 1 from public.workspace_members m
      where m.tenant_id = billing_subscriptions.tenant_id
        and m.user_id = auth.uid()
    )
  );

create policy billing_battery_member_read on public.billing_batteries
  for select
  using (
    exists (
      select 1 from public.workspace_members m
      where m.tenant_id = billing_batteries.tenant_id
        and m.user_id = auth.uid()
    )
  );

create policy billing_ledger_member_read on public.billing_ledger
  for select
  using (
    exists (
      select 1 from public.workspace_members m
      where m.tenant_id = billing_ledger.tenant_id
        and m.user_id = auth.uid()
    )
  );

-- Writes are service-role only. Plan changes and credit movements must
-- always go through the server (Stripe webhook + ai-runtime debits).
-- No write policies = no tenant-side INSERT/UPDATE/DELETE.

create or replace function public.touch_billing_subscriptions_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists billing_sub_touch on public.billing_subscriptions;
create trigger billing_sub_touch
  before update on public.billing_subscriptions
  for each row
  execute function public.touch_billing_subscriptions_updated_at();

create or replace function public.touch_billing_batteries_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists billing_battery_touch on public.billing_batteries;
create trigger billing_battery_touch
  before update on public.billing_batteries
  for each row
  execute function public.touch_billing_batteries_updated_at();
