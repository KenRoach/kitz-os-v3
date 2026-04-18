-- Migration 0006: whatsapp_sessions (one row per tenant, Baileys lifecycle)
-- Rollback: 0006_whatsapp.down.sql

create table if not exists public.whatsapp_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  phone text,
  status text not null default 'idle'
    check (status in ('idle', 'requesting_qr', 'awaiting_scan', 'connected', 'disconnected', 'error')),
  qr_data_url text,
  qr_expires_at timestamptz,
  last_error text,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_tenant on public.whatsapp_sessions (tenant_id);
create index if not exists idx_whatsapp_status on public.whatsapp_sessions (status);

alter table public.whatsapp_sessions enable row level security;

create policy whatsapp_tenant_read on public.whatsapp_sessions
  for select using (
    exists (
      select 1 from public.workspace_members wm
      where wm.tenant_id = whatsapp_sessions.tenant_id and wm.user_id = auth.uid()
    )
  );

-- QR content is never writable from the client; only the service role
-- (ai-runtime, via Baileys) may update the row.
create policy whatsapp_no_client_write on public.whatsapp_sessions
  for all using (false) with check (false);

drop trigger if exists trg_whatsapp_updated_at on public.whatsapp_sessions;
create trigger trg_whatsapp_updated_at
  before update on public.whatsapp_sessions
  for each row execute function public.set_updated_at();
