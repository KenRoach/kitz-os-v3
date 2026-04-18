-- Rollback for 0006_whatsapp.sql
drop trigger if exists trg_whatsapp_updated_at on public.whatsapp_sessions;
drop table if exists public.whatsapp_sessions;
