-- Rollback for 0010_documents.sql
drop trigger if exists documents_touch_updated_at on public.documents;
drop function if exists public.touch_documents_updated_at();
drop policy if exists documents_member_write on public.documents;
drop policy if exists documents_member_read on public.documents;
drop index if exists public.documents_tenant_kind_status_idx;
drop index if exists public.documents_tenant_created_idx;
drop table if exists public.documents;
