-- Rollback for 0004_agents.sql

drop trigger if exists trg_agents_updated_at on public.agents;
drop table if exists public.agents;
