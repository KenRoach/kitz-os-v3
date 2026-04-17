-- Migration 0001: initial schema for tenants, auth, and OTP
-- Rollback: see 0001_init.down.sql

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ============================================================
-- tenants — one row per customer workspace
-- ============================================================
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (char_length(slug) between 2 and 64),
  name text not null,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro', 'enterprise')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_tenants_slug on public.tenants (slug);

alter table public.tenants enable row level security;

-- Members can read their own tenant; service role bypasses RLS.
create policy tenants_member_read on public.tenants
  for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.tenant_id = tenants.id and wm.user_id = auth.uid()
    )
  );

-- Owners can update their tenant.
create policy tenants_owner_update on public.tenants
  for update
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.tenant_id = tenants.id
        and wm.user_id = auth.uid()
        and wm.role = 'owner'
    )
  );

-- ============================================================
-- user_profiles — KitZ-side profile data keyed to auth.users.id
-- ============================================================
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  locale text not null default 'es' check (locale in ('es', 'en', 'pt')),
  created_at timestamptz not null default now()
);

create index if not exists idx_user_profiles_email on public.user_profiles (email);

alter table public.user_profiles enable row level security;

create policy user_profiles_self_read on public.user_profiles
  for select using (id = auth.uid());

create policy user_profiles_self_update on public.user_profiles
  for update using (id = auth.uid());

-- ============================================================
-- workspace_members — join table: user ↔ tenant with role
-- ============================================================
create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  invited_by uuid references auth.users(id),
  joined_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create index if not exists idx_workspace_members_tenant on public.workspace_members (tenant_id);
create index if not exists idx_workspace_members_user on public.workspace_members (user_id);

alter table public.workspace_members enable row level security;

create policy workspace_members_self_read on public.workspace_members
  for select using (user_id = auth.uid());

create policy workspace_members_same_tenant_read on public.workspace_members
  for select using (
    exists (
      select 1 from public.workspace_members me
      where me.tenant_id = workspace_members.tenant_id
        and me.user_id = auth.uid()
    )
  );

-- ============================================================
-- auth_otps — short-lived 6-digit OTP codes
-- Stored hashed; expires in 10 minutes; max 5 attempts
-- ============================================================
create table if not exists public.auth_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_otps_email on public.auth_otps (email);
create index if not exists idx_auth_otps_expires_at on public.auth_otps (expires_at);

alter table public.auth_otps enable row level security;

-- No client access to OTPs ever — service role only.
create policy auth_otps_no_client_access on public.auth_otps
  for all using (false);
