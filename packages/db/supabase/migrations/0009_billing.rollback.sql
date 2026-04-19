-- Rollback for 0009_billing.sql
drop trigger if exists billing_battery_touch on public.billing_batteries;
drop trigger if exists billing_sub_touch on public.billing_subscriptions;
drop function if exists public.touch_billing_batteries_updated_at();
drop function if exists public.touch_billing_subscriptions_updated_at();
drop policy if exists billing_ledger_member_read on public.billing_ledger;
drop policy if exists billing_battery_member_read on public.billing_batteries;
drop policy if exists billing_sub_member_read on public.billing_subscriptions;
drop index if exists public.billing_ledger_tenant_created_idx;
drop table if exists public.billing_ledger;
drop table if exists public.billing_batteries;
drop table if exists public.billing_subscriptions;
