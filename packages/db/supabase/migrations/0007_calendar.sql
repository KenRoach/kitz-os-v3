-- Migration 0007: calendar_events
-- Rollback: see 0007_calendar.down.sql

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  attendees text[] not null default '{}',
  contact_id uuid references public.contacts(id) on delete set null,
  external_provider text check (external_provider in ('google')),
  external_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at >= start_at)
);

create index if not exists idx_calendar_tenant on public.calendar_events (tenant_id);
create index if not exists idx_calendar_tenant_start on public.calendar_events (tenant_id, start_at);
create index if not exists idx_calendar_contact on public.calendar_events (contact_id) where contact_id is not null;

alter table public.calendar_events enable row level security;

create policy calendar_tenant_read on public.calendar_events
  for select using (
    exists (
      select 1 from public.workspace_members wm
      where wm.tenant_id = calendar_events.tenant_id and wm.user_id = auth.uid()
    )
  );

create policy calendar_tenant_write on public.calendar_events
  for all using (
    exists (
      select 1 from public.workspace_members wm
      where wm.tenant_id = calendar_events.tenant_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin', 'member')
    )
  )
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.tenant_id = calendar_events.tenant_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin', 'member')
    )
  );

drop trigger if exists trg_calendar_updated_at on public.calendar_events;
create trigger trg_calendar_updated_at
  before update on public.calendar_events
  for each row execute function public.set_updated_at();
