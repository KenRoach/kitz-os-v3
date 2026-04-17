-- Migration 0003: deals pipeline
-- Rollback: see 0003_deals.down.sql

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  amount numeric(14,2) not null default 0 check (amount >= 0),
  currency text not null default 'USD' check (char_length(currency) = 3),
  stage text not null default 'prospecto' check (
    stage in ('prospecto', 'calificado', 'propuesta', 'negociacion', 'ganado', 'perdido')
  ),
  probability int not null default 20 check (probability between 0 and 100),
  notes text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_deals_tenant on public.deals (tenant_id);
create index if not exists idx_deals_tenant_stage on public.deals (tenant_id, stage);
create index if not exists idx_deals_tenant_created on public.deals (tenant_id, created_at desc);
create index if not exists idx_deals_contact on public.deals (contact_id) where contact_id is not null;

alter table public.deals enable row level security;

create policy deals_tenant_read on public.deals
  for select using (
    exists (
      select 1 from public.workspace_members wm
      where wm.tenant_id = deals.tenant_id and wm.user_id = auth.uid()
    )
  );

create policy deals_tenant_write on public.deals
  for all using (
    exists (
      select 1 from public.workspace_members wm
      where wm.tenant_id = deals.tenant_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin', 'member')
    )
  )
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.tenant_id = deals.tenant_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin', 'member')
    )
  );

drop trigger if exists trg_deals_updated_at on public.deals;
create trigger trg_deals_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();
