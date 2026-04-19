import { randomUUID } from 'node:crypto';

export const FEEDBACK_TYPES = ['bug', 'feature_request', 'complaint', 'praise'] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const FEEDBACK_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type FeedbackPriority = (typeof FEEDBACK_PRIORITIES)[number];

export const FEEDBACK_STATUSES = ['open', 'acknowledged', 'in_progress', 'resolved'] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export type FeedbackRecord = {
  id: string;
  tenant_id: string;
  type: FeedbackType;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  summary: string;
  detail: string | null;
  reported_by: string | null;
  agent_slug: string | null;
  feature_area: string | null;
  created_at: string;
  updated_at: string;
};

export type FeedbackInput = {
  type: FeedbackType;
  priority?: FeedbackPriority;
  summary: string;
  detail?: string | null;
  reported_by?: string | null;
  agent_slug?: string | null;
  feature_area?: string | null;
};

export type FeedbackPatch = Partial<Pick<FeedbackInput, 'priority' | 'detail' | 'feature_area'>> & {
  status?: FeedbackStatus;
};

function nowIso(): string {
  return new Date().toISOString();
}

export type FeedbackStore = {
  list(
    tenantId: string,
    opts?: { type?: FeedbackType; status?: FeedbackStatus; limit?: number; offset?: number },
  ): Promise<{ items: FeedbackRecord[]; total: number }>;
  get(tenantId: string, id: string): Promise<FeedbackRecord | null>;
  create(tenantId: string, input: FeedbackInput): Promise<FeedbackRecord>;
  update(tenantId: string, id: string, patch: FeedbackPatch): Promise<FeedbackRecord | null>;
  count(tenantId: string): Promise<number>;
};

export function createMemoryFeedbackStore(): FeedbackStore {
  const byTenant = new Map<string, Map<string, FeedbackRecord>>();

  function bucket(tenantId: string): Map<string, FeedbackRecord> {
    let m = byTenant.get(tenantId);
    if (!m) {
      m = new Map();
      byTenant.set(tenantId, m);
    }
    return m;
  }

  return {
    async list(tenantId, opts) {
      const all = [...bucket(tenantId).values()]
        .filter((r) => {
          if (opts?.type && r.type !== opts.type) return false;
          if (opts?.status && r.status !== opts.status) return false;
          return true;
        })
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      const offset = opts?.offset ?? 0;
      const limit = opts?.limit ?? 50;
      return { items: all.slice(offset, offset + limit), total: all.length };
    },

    async get(tenantId, id) {
      return bucket(tenantId).get(id) ?? null;
    },

    async create(tenantId, input) {
      const now = nowIso();
      const record: FeedbackRecord = {
        id: randomUUID(),
        tenant_id: tenantId,
        type: input.type,
        priority: input.priority ?? 'medium',
        status: 'open',
        summary: input.summary,
        detail: input.detail ?? null,
        reported_by: input.reported_by ?? null,
        agent_slug: input.agent_slug ?? null,
        feature_area: input.feature_area ?? null,
        created_at: now,
        updated_at: now,
      };
      bucket(tenantId).set(record.id, record);
      return record;
    },

    async update(tenantId, id, patch) {
      const existing = bucket(tenantId).get(id);
      if (!existing) return null;
      const updated: FeedbackRecord = {
        ...existing,
        priority: patch.priority ?? existing.priority,
        detail: patch.detail !== undefined ? patch.detail : existing.detail,
        feature_area:
          patch.feature_area !== undefined ? patch.feature_area : existing.feature_area,
        status: patch.status ?? existing.status,
        updated_at: nowIso(),
      };
      bucket(tenantId).set(id, updated);
      return updated;
    },

    async count(tenantId) {
      return bucket(tenantId).size;
    },
  };
}
