-- Rollback for 0007_calendar.sql
drop trigger if exists trg_calendar_updated_at on public.calendar_events;
drop table if exists public.calendar_events;
