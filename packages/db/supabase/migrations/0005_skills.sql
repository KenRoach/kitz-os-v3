-- Migration 0005: skills (long-chain capabilities attachable to agents)
-- Rollback: see 0005_skills.down.sql

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slug text not null check (char_length(slug) between 2 and 64),
  name text not null check (char_length(name) between 1 and 120),
  description text,
  kind text not null check (kind in ('mcp_file', 'prompt_chain', 'webhook')),
  source text not null check (char_length(source) between 1 and 2000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create index if not exists idx_skills_tenant on public.skills (tenant_id);
create index if not exists idx_skills_tenant_kind on public.skills (tenant_id, kind);
create index if not exists idx_skills_tenant_created on public.skills (tenant_id, created_at desc);

alter table public.skills enable row level security;

create policy skills_tenant_read on public.skills
  for select using (
    exists (
      select 1 from public.workspace_members wm
      where wm.tenant_id = skills.tenant_id and wm.user_id = auth.uid()
    )
  );

create policy skills_tenant_write on public.skills
  for all using (
    exists (
      select 1 from public.workspace_members wm
      where wm.tenant_id = skills.tenant_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin', 'member')
    )
  )
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.tenant_id = skills.tenant_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin', 'member')
    )
  );

drop trigger if exists trg_skills_updated_at on public.skills;
create trigger trg_skills_updated_at
  before update on public.skills
  for each row execute function public.set_updated_at();
