import { randomUUID } from 'node:crypto';
import { BILLING_PLAN_SPECS, type BillingPlan } from './billing-plans';

export type BillingSubscription = {
  tenant_id: string;
  plan: BillingPlan;
  status: 'active' | 'cancelled' | 'past_due';
  /** ISO; null while on `free`. */
  current_period_end: string | null;
  external_customer_id: string | null;
  external_subscription_id: string | null;
  created_at: string;
  updated_at: string;
};

export type BatteryLedgerEntry = {
  id: string;
  tenant_id: string;
  /** Positive for topups/grants, negative for debits. */
  delta: number;
  reason: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type BatteryState = {
  tenant_id: string;
  balance: number;
  lifetime_topup: number;
  lifetime_debit: number;
  updated_at: string;
};

export type BillingStore = {
  getSubscription(tenantId: string): Promise<BillingSubscription>;
  setPlan(
    tenantId: string,
    plan: BillingPlan,
    opts?: { externalCustomerId?: string; externalSubscriptionId?: string },
  ): Promise<BillingSubscription>;
  cancel(tenantId: string): Promise<BillingSubscription>;

  getBattery(tenantId: string): Promise<BatteryState>;
  /** Apply positive credit. Records a ledger entry. */
  topup(
    tenantId: string,
    credits: number,
    reason: string,
    metadata?: Record<string, unknown>,
  ): Promise<BatteryState>;
  /** Apply negative debit. Throws `insufficient_credits` if balance would go below 0. */
  debit(
    tenantId: string,
    credits: number,
    reason: string,
    metadata?: Record<string, unknown>,
  ): Promise<BatteryState>;
  ledger(tenantId: string, limit?: number): Promise<BatteryLedgerEntry[]>;
};

function nowIso(): string {
  return new Date().toISOString();
}

function makeDefaultSub(tenantId: string): BillingSubscription {
  return {
    tenant_id: tenantId,
    plan: 'free',
    status: 'active',
    current_period_end: null,
    external_customer_id: null,
    external_subscription_id: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
}

function makeDefaultBattery(tenantId: string): BatteryState {
  const grant = BILLING_PLAN_SPECS.free.monthlyCredits;
  return {
    tenant_id: tenantId,
    balance: grant,
    lifetime_topup: grant,
    lifetime_debit: 0,
    updated_at: nowIso(),
  };
}

export function createMemoryBillingStore(): BillingStore {
  const subs = new Map<string, BillingSubscription>();
  const batteries = new Map<string, BatteryState>();
  const ledgers = new Map<string, BatteryLedgerEntry[]>();

  function ensureSub(tenantId: string): BillingSubscription {
    let s = subs.get(tenantId);
    if (!s) {
      s = makeDefaultSub(tenantId);
      subs.set(tenantId, s);
    }
    return s;
  }

  function ensureBattery(tenantId: string): BatteryState {
    let b = batteries.get(tenantId);
    if (!b) {
      b = makeDefaultBattery(tenantId);
      batteries.set(tenantId, b);
      const seed: BatteryLedgerEntry = {
        id: randomUUID(),
        tenant_id: tenantId,
        delta: b.balance,
        reason: 'plan_grant_free',
        metadata: { plan: 'free' },
        created_at: nowIso(),
      };
      ledgers.set(tenantId, [seed]);
    }
    return b;
  }

  function appendLedger(entry: BatteryLedgerEntry): void {
    const arr = ledgers.get(entry.tenant_id) ?? [];
    arr.unshift(entry);
    ledgers.set(entry.tenant_id, arr);
  }

  return {
    async getSubscription(tenantId) {
      return ensureSub(tenantId);
    },

    async setPlan(tenantId, plan, opts) {
      const spec = BILLING_PLAN_SPECS[plan];
      if (!spec) throw new Error('invalid_plan');
      const prev = ensureSub(tenantId);
      const next: BillingSubscription = {
        ...prev,
        plan,
        status: 'active',
        current_period_end:
          plan === 'free'
            ? null
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        external_customer_id: opts?.externalCustomerId ?? prev.external_customer_id,
        external_subscription_id: opts?.externalSubscriptionId ?? prev.external_subscription_id,
        updated_at: nowIso(),
      };
      subs.set(tenantId, next);

      // Grant the plan's monthly credits if upgrading or renewing into a paid plan.
      if (plan !== prev.plan && spec.monthlyCredits > 0) {
        const battery = ensureBattery(tenantId);
        const updated: BatteryState = {
          ...battery,
          balance: battery.balance + spec.monthlyCredits,
          lifetime_topup: battery.lifetime_topup + spec.monthlyCredits,
          updated_at: nowIso(),
        };
        batteries.set(tenantId, updated);
        appendLedger({
          id: randomUUID(),
          tenant_id: tenantId,
          delta: spec.monthlyCredits,
          reason: `plan_grant_${plan}`,
          metadata: { plan, previous: prev.plan },
          created_at: nowIso(),
        });
      }
      return next;
    },

    async cancel(tenantId) {
      const prev = ensureSub(tenantId);
      const next: BillingSubscription = {
        ...prev,
        status: 'cancelled',
        updated_at: nowIso(),
      };
      subs.set(tenantId, next);
      return next;
    },

    async getBattery(tenantId) {
      return ensureBattery(tenantId);
    },

    async topup(tenantId, credits, reason, metadata) {
      if (!Number.isFinite(credits) || credits <= 0 || credits > 1_000_000) {
        throw new Error('invalid_credits');
      }
      const battery = ensureBattery(tenantId);
      const updated: BatteryState = {
        ...battery,
        balance: battery.balance + credits,
        lifetime_topup: battery.lifetime_topup + credits,
        updated_at: nowIso(),
      };
      batteries.set(tenantId, updated);
      appendLedger({
        id: randomUUID(),
        tenant_id: tenantId,
        delta: credits,
        reason,
        metadata: metadata ?? {},
        created_at: nowIso(),
      });
      return updated;
    },

    async debit(tenantId, credits, reason, metadata) {
      if (!Number.isFinite(credits) || credits <= 0 || credits > 1_000_000) {
        throw new Error('invalid_credits');
      }
      const battery = ensureBattery(tenantId);
      if (battery.balance < credits) throw new Error('insufficient_credits');
      const updated: BatteryState = {
        ...battery,
        balance: battery.balance - credits,
        lifetime_debit: battery.lifetime_debit + credits,
        updated_at: nowIso(),
      };
      batteries.set(tenantId, updated);
      appendLedger({
        id: randomUUID(),
        tenant_id: tenantId,
        delta: -credits,
        reason,
        metadata: metadata ?? {},
        created_at: nowIso(),
      });
      return updated;
    },

    async ledger(tenantId, limit = 50) {
      ensureBattery(tenantId);
      const arr = ledgers.get(tenantId) ?? [];
      return arr.slice(0, Math.max(1, Math.min(limit, 200)));
    },
  };
}
