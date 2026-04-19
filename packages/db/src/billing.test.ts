import { describe, it, expect } from 'vitest';
import { createMemoryBillingStore } from './billing';

const T = 't-1';
const OTHER = 't-2';

describe('billing store', () => {
  it('seeds free plan with default battery and grant ledger entry', async () => {
    const s = createMemoryBillingStore();
    const sub = await s.getSubscription(T);
    expect(sub.plan).toBe('free');
    expect(sub.status).toBe('active');
    expect(sub.current_period_end).toBeNull();
    const battery = await s.getBattery(T);
    expect(battery.balance).toBe(100);
    expect(battery.lifetime_topup).toBe(100);
    const ledger = await s.ledger(T);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]?.reason).toBe('plan_grant_free');
    expect(ledger[0]?.delta).toBe(100);
  });

  it('upgrades plan, grants monthly credits, sets period end', async () => {
    const s = createMemoryBillingStore();
    await s.getBattery(T); // seed free first
    const sub = await s.setPlan(T, 'starter', {
      externalCustomerId: 'cus_1',
      externalSubscriptionId: 'sub_1',
    });
    expect(sub.plan).toBe('starter');
    expect(sub.current_period_end).not.toBeNull();
    expect(sub.external_customer_id).toBe('cus_1');
    const battery = await s.getBattery(T);
    expect(battery.balance).toBe(100 + 1500);
    const ledger = await s.ledger(T);
    expect(ledger[0]?.reason).toBe('plan_grant_starter');
    expect(ledger[0]?.delta).toBe(1500);
  });

  it('does not double-grant when calling setPlan with the same plan', async () => {
    const s = createMemoryBillingStore();
    await s.setPlan(T, 'pro');
    const before = await s.getBattery(T);
    await s.setPlan(T, 'pro');
    const after = await s.getBattery(T);
    expect(after.balance).toBe(before.balance);
  });

  it('topup adds credits and records ledger entry', async () => {
    const s = createMemoryBillingStore();
    const after = await s.topup(T, 500, 'pack_500', { stripeIntent: 'pi_1' });
    expect(after.balance).toBe(600);
    expect(after.lifetime_topup).toBe(600);
    const ledger = await s.ledger(T);
    expect(ledger[0]?.delta).toBe(500);
    expect(ledger[0]?.metadata?.['stripeIntent']).toBe('pi_1');
  });

  it('debit deducts credits and records negative ledger entry', async () => {
    const s = createMemoryBillingStore();
    const after = await s.debit(T, 30, 'agent_run', { agentId: 'a-1' });
    expect(after.balance).toBe(70);
    expect(after.lifetime_debit).toBe(30);
    const ledger = await s.ledger(T);
    expect(ledger[0]?.delta).toBe(-30);
  });

  it('debit throws when balance insufficient', async () => {
    const s = createMemoryBillingStore();
    await expect(s.debit(T, 999999, 'big')).rejects.toThrow('insufficient_credits');
  });

  it('rejects invalid credit amounts', async () => {
    const s = createMemoryBillingStore();
    await expect(s.topup(T, 0, 'bad')).rejects.toThrow('invalid_credits');
    await expect(s.topup(T, -1, 'bad')).rejects.toThrow('invalid_credits');
    await expect(s.debit(T, 0, 'bad')).rejects.toThrow('invalid_credits');
    await expect(s.debit(T, Number.NaN, 'bad')).rejects.toThrow('invalid_credits');
  });

  it('cancel keeps plan but flips status', async () => {
    const s = createMemoryBillingStore();
    await s.setPlan(T, 'starter');
    const cancelled = await s.cancel(T);
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.plan).toBe('starter');
  });

  it('isolates per tenant', async () => {
    const s = createMemoryBillingStore();
    await s.topup(T, 100, 'x');
    const other = await s.getBattery(OTHER);
    expect(other.balance).toBe(100);
    const mine = await s.getBattery(T);
    expect(mine.balance).toBe(200);
  });

  it('ledger respects limit', async () => {
    const s = createMemoryBillingStore();
    for (let i = 0; i < 10; i++) {
      await s.topup(T, 1, `t_${i}`);
    }
    const lim = await s.ledger(T, 3);
    expect(lim).toHaveLength(3);
  });
});
