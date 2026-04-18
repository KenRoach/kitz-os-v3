-- Rollback for 0005_skills.sql
drop trigger if exists trg_skills_updated_at on public.skills;
drop table if exists public.skills;
