-- Rollback for 0001_init.sql

drop table if exists public.auth_otps;
drop table if exists public.workspace_members;
drop table if exists public.user_profiles;
drop table if exists public.tenants;

-- Extensions left in place — other migrations may depend on them.
