-- Migration 0002: contacts + activity_feed + ai_battery
-- Rollback: see 0002_contacts.down.sql

-- ============================================================
-- contacts — per-tenant CRM records
-- ============================================================
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  email text,
  phone text,
  company text,
  tags text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contacts_tenant on public.contacts (tenant_id);
create index if not exists idx_contacts_tenant_created on public.contacts (tenant_id, created_at desc);
create index if not exists idx_contacts_email on public.contacts (tenant_id, email) where email is not null;
create index if not exists idx_contacts_phone on public.contacts (tenant_id, phone) where phone is not null;

alter table public.contacts enable row level security;

-- Members of the tenant can read contacts.
create policy contacts_tenant_read on public.contacts
  for select using (
    exists (
      select 1 from public.workspace_members wm
      where wm.tenant_id = contacts.tenant_id and wm.user_id = auth.uid()
    )
  );

-- Owners, admins, and members can mutate. Viewers are read-only.
create policy contacts_tenant_write on public.contacts
  for all using (
    exists (
      select 1 from public.workspace_members wm
      where wm.tenant_id = contacts.tenant_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin', 'member')
    )
  )
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.tenant_id = contacts.tenant_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin', 'member')
    )
  );

-- Trigger to keep updated_at fresh on UPDATE.
create or replace function public.set_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_contacts_updated_at on public.contacts;
create trigger trg_contacts_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- ============================================================
-- activity_feed — timeline of tenant events
-- ============================================================
create table if not exists public.activity_feed (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor uuid references auth.users(id),
  action text not null,
  entity text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_tenant_created
  on public.activity_feed (tenant_id, created_at desc);

alter table public.activity_feed enable row level security;

create policy activity_tenant_read on public.activity_feed
  for select using (
    exists (
      select 1 from public.workspace_members wm
      where wm.tenant_id = activity_feed.tenant_id and wm.user_id = auth.uid()
    )
  );

-- Only service role inserts into activity_feed (via API routes).
create policy activity_no_client_insert on public.activity_feed
  for insert with check (false);

-- ============================================================
-- ai_battery — per-tenant credit balance
-- ============================================================
create table if not exists public.ai_battery (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  credits_remaining int not null default 0 check (credits_remaining >= 0),
  credits_used int not null default 0 check (credits_used >= 0),
  lifetime_topup int not null default 0 check (lifetime_topup >= 0),
  reset_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_battery enable row level security;

create policy ai_battery_tenant_read on public.ai_battery
  for select using (
    exists (
      select 1 from public.workspace_members wm
      where wm.tenant_id = ai_battery.tenant_id and wm.user_id = auth.uid()
    )
  );

create policy ai_battery_no_client_write on public.ai_battery
  for all using (false) with check (false);
