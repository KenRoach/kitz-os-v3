-- Migration 0004: agents
-- Rollback: see 0004_agents.down.sql

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slug text not null check (char_length(slug) between 2 and 64),
  name text not null check (char_length(name) between 1 and 120),
  description text,
  system_prompt text not null check (char_length(system_prompt) between 4 and 8000),
  model text not null default 'haiku' check (model in ('haiku', 'sonnet', 'opus')),
  tools text[] not null default '{}',
  skills text[] not null default '{}',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create index if not exists idx_agents_tenant on public.agents (tenant_id);
create index if not exists idx_agents_tenant_active on public.agents (tenant_id) where is_active = true;
create index if not exists idx_agents_tenant_created on public.agents (tenant_id, created_at desc);

-- Only one active agent per tenant.
create unique index if not exists uniq_agents_one_active_per_tenant
  on public.agents (tenant_id) where is_active = true;

alter table public.agents enable row level security;

create policy agents_tenant_read on public.agents
  for select using (
    exists (
      select 1 from public.workspace_members wm
      where wm.tenant_id = agents.tenant_id and wm.user_id = auth.uid()
    )
  );

create policy agents_tenant_write on public.agents
  for all using (
    exists (
      select 1 from public.workspace_members wm
      where wm.tenant_id = agents.tenant_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin', 'member')
    )
  )
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.tenant_id = agents.tenant_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin', 'member')
    )
  );

drop trigger if exists trg_agents_updated_at on public.agents;
create trigger trg_agents_updated_at
  before update on public.agents
  for each row execute function public.set_updated_at();
