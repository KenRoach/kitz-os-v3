import { randomUUID } from 'node:crypto';
import { DEAL_STAGES, type DealStage } from './deal-stages';

export { DEAL_STAGES };
export type { DealStage };

export type Deal = {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  title: string;
  amount: number;
  currency: string;
  stage: DealStage;
  probability: number;
  notes: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DealInput = {
  title: string;
  amount?: number;
  currency?: string;
  stage?: DealStage;
  probability?: number;
  contactId?: string | null;
  notes?: string | null;
};

export type DealPatch = Partial<DealInput>;

function nowIso(): string {
  return new Date().toISOString();
}

function isClosedStage(stage: DealStage): boolean {
  return stage === 'ganado' || stage === 'perdido';
}

export type DealsStore = {
  list(tenantId: string, opts?: { stage?: DealStage }): Promise<Deal[]>;
  get(tenantId: string, id: string): Promise<Deal | null>;
  create(tenantId: string, input: DealInput): Promise<Deal>;
  update(tenantId: string, id: string, patch: DealPatch): Promise<Deal | null>;
  remove(tenantId: string, id: string): Promise<boolean>;
  count(tenantId: string): Promise<number>;
  summary(tenantId: string): Promise<{
    byStage: Record<DealStage, { count: number; total: number }>;
    pipelineValue: number;
  }>;
};

export function createMemoryDealsStore(): DealsStore {
  const byTenant = new Map<string, Map<string, Deal>>();

  function bucket(tenantId: string): Map<string, Deal> {
    let b = byTenant.get(tenantId);
    if (!b) {
      b = new Map();
      byTenant.set(tenantId, b);
    }
    return b;
  }

  function emptyByStage(): Record<DealStage, { count: number; total: number }> {
    return DEAL_STAGES.reduce(
      (acc, s) => {
        acc[s] = { count: 0, total: 0 };
        return acc;
      },
      {} as Record<DealStage, { count: number; total: number }>,
    );
  }

  return {
    async list(tenantId, opts) {
      const all = Array.from(bucket(tenantId).values()).sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      );
      if (!opts?.stage) return all;
      return all.filter((d) => d.stage === opts.stage);
    },

    async get(tenantId, id) {
      return bucket(tenantId).get(id) ?? null;
    },

    async create(tenantId, input) {
      const title = input.title.trim();
      if (title.length < 1 || title.length > 200) throw new Error('invalid_title');
      const amount = input.amount ?? 0;
      if (!Number.isFinite(amount) || amount < 0) throw new Error('invalid_amount');
      const stage: DealStage = input.stage ?? 'prospecto';
      const probability =
        input.probability ?? (stage === 'ganado' ? 100 : stage === 'perdido' ? 0 : 20);
      if (probability < 0 || probability > 100) throw new Error('invalid_probability');

      const deal: Deal = {
        id: randomUUID(),
        tenant_id: tenantId,
        contact_id: input.contactId ?? null,
        title,
        amount,
        currency: (input.currency ?? 'USD').toUpperCase(),
        stage,
        probability,
        notes: input.notes?.trim() || null,
        closed_at: isClosedStage(stage) ? nowIso() : null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      bucket(tenantId).set(deal.id, deal);
      return deal;
    },

    async update(tenantId, id, patch) {
      const existing = bucket(tenantId).get(id);
      if (!existing) return null;
      const nextStage: DealStage = patch.stage ?? existing.stage;
      const stageChanged = patch.stage !== undefined && patch.stage !== existing.stage;
      const updated: Deal = {
        ...existing,
        ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
        ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
        ...(patch.currency !== undefined ? { currency: patch.currency.toUpperCase() } : {}),
        ...(patch.stage !== undefined ? { stage: nextStage } : {}),
        ...(patch.probability !== undefined ? { probability: patch.probability } : {}),
        ...(patch.contactId !== undefined ? { contact_id: patch.contactId } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes?.trim() || null } : {}),
        closed_at: isClosedStage(nextStage)
          ? stageChanged || !existing.closed_at
            ? nowIso()
            : existing.closed_at
          : null,
        updated_at: nowIso(),
      };
      bucket(tenantId).set(id, updated);
      return updated;
    },

    async remove(tenantId, id) {
      return bucket(tenantId).delete(id);
    },

    async count(tenantId) {
      return bucket(tenantId).size;
    },

    async summary(tenantId) {
      const byStage = emptyByStage();
      let pipelineValue = 0;
      for (const d of bucket(tenantId).values()) {
        const slot = byStage[d.stage];
        slot.count += 1;
        slot.total += d.amount;
        if (d.stage !== 'ganado' && d.stage !== 'perdido') {
          pipelineValue += d.amount;
        }
      }
      return { byStage, pipelineValue };
    },
  };
}
