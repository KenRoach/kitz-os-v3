-- Rollback for 0003_deals.sql

drop trigger if exists trg_deals_updated_at on public.deals;
drop table if exists public.deals;
