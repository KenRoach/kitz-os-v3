-- Rollback for 0008_invoices.sql
drop trigger if exists invoices_touch_updated_at on public.invoices;
drop function if exists public.touch_invoices_updated_at();
drop policy if exists invoices_member_write on public.invoices;
drop policy if exists invoices_member_read on public.invoices;
drop index if exists public.invoices_tenant_status_idx;
drop index if exists public.invoices_tenant_created_idx;
drop table if exists public.invoices;
