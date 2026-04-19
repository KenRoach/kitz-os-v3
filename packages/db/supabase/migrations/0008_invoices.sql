-- M13 Invoicing / Quotes
-- Single table covers both quotes and invoices (`kind` discriminates).
-- Line items embedded as jsonb to keep the artifact atomic; a separate
-- normalized table is overkill for this stage and complicates RLS.

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  kind text not null check (kind in ('quote', 'invoice')),
  number text not null,
  contact_id uuid references public.contacts(id) on delete set null,
  customer_name text not null check (char_length(customer_name) between 1 and 200),
  customer_email text,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(14,2) not null default 0,
  tax_rate numeric(5,4) not null default 0 check (tax_rate >= 0 and tax_rate <= 1),
  tax numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  currency text not null default 'USD',
  status text not null default 'draft'
    check (status in ('draft','sent','accepted','paid','cancelled','expired')),
  notes text,
  due_at timestamptz,
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, number)
);

create index if not exists invoices_tenant_created_idx
  on public.invoices (tenant_id, created_at desc);

create index if not exists invoices_tenant_status_idx
  on public.invoices (tenant_id, kind, status);

alter table public.invoices enable row level security;

-- Members can read invoices for their tenants.
create policy invoices_member_read on public.invoices
  for select
  using (
    exists (
      select 1 from public.workspace_members m
      where m.tenant_id = invoices.tenant_id
        and m.user_id = auth.uid()
    )
  );

-- Owner / admin / member can write. Viewer is read-only.
create policy invoices_member_write on public.invoices
  for all
  using (
    exists (
      select 1 from public.workspace_members m
      where m.tenant_id = invoices.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'member')
    )
  )
  with check (
    exists (
      select 1 from public.workspace_members m
      where m.tenant_id = invoices.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'member')
    )
  );

create or replace function public.touch_invoices_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists invoices_touch_updated_at on public.invoices;
create trigger invoices_touch_updated_at
  before update on public.invoices
  for each row
  execute function public.touch_invoices_updated_at();
