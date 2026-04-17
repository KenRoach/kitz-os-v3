-- Rollback for 0002_contacts.sql

drop trigger if exists trg_contacts_updated_at on public.contacts;
drop function if exists public.set_updated_at();
drop table if exists public.ai_battery;
drop table if exists public.activity_feed;
drop table if exists public.contacts;
