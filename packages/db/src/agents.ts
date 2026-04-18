import { randomUUID } from 'node:crypto';
import { AGENT_MODELS, type AgentModel } from './agent-models';

export { AGENT_MODELS };
export type { AgentModel };

export type Agent = {
  id: string;
  tenant_id: string;
  slug: string;
  name: string;
  description: string | null;
  system_prompt: string;
  model: AgentModel;
  tools: string[];
  /**
   * Skill ids attached to this agent. A "skill" is a long-chain MCP file
   * (or set of files) that the agent can invoke. Real skill registry lives
   * in Module 10.
   */
  skills: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AgentInput = {
  slug: string;
  name: string;
  description?: string | null;
  systemPrompt: string;
  model?: AgentModel;
  tools?: string[];
  skills?: string[];
  isActive?: boolean;
};

export type AgentPatch = Partial<{
  name: string;
  description: string | null;
  systemPrompt: string;
  model: AgentModel;
  tools: string[];
  skills: string[];
  isActive: boolean;
}>;

function nowIso(): string {
  return new Date().toISOString();
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export type AgentsStore = {
  list(tenantId: string): Promise<Agent[]>;
  get(tenantId: string, id: string): Promise<Agent | null>;
  getBySlug(tenantId: string, slug: string): Promise<Agent | null>;
  getActive(tenantId: string): Promise<Agent | null>;
  create(tenantId: string, input: AgentInput): Promise<Agent>;
  update(tenantId: string, id: string, patch: AgentPatch): Promise<Agent | null>;
  remove(tenantId: string, id: string): Promise<boolean>;
  count(tenantId: string): Promise<number>;
  setActive(tenantId: string, id: string): Promise<Agent | null>;
};

export function createMemoryAgentsStore(): AgentsStore {
  const byTenant = new Map<string, Map<string, Agent>>();

  function bucket(tenantId: string): Map<string, Agent> {
    let b = byTenant.get(tenantId);
    if (!b) {
      b = new Map();
      byTenant.set(tenantId, b);
    }
    return b;
  }

  return {
    async list(tenantId) {
      return Array.from(bucket(tenantId).values()).sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      );
    },

    async get(tenantId, id) {
      return bucket(tenantId).get(id) ?? null;
    },

    async getBySlug(tenantId, slug) {
      for (const a of bucket(tenantId).values()) {
        if (a.slug === slug) return a;
      }
      return null;
    },

    async getActive(tenantId) {
      for (const a of bucket(tenantId).values()) {
        if (a.is_active) return a;
      }
      return null;
    },

    async create(tenantId, input) {
      const slug = input.slug.trim().toLowerCase();
      if (!SLUG_RE.test(slug) || slug.length < 2 || slug.length > 64) {
        throw new Error('invalid_slug');
      }
      const name = input.name.trim();
      if (name.length < 1 || name.length > 120) throw new Error('invalid_name');
      const prompt = input.systemPrompt.trim();
      if (prompt.length < 4 || prompt.length > 8000) throw new Error('invalid_prompt');

      for (const a of bucket(tenantId).values()) {
        if (a.slug === slug) throw new Error('slug_taken');
      }

      const requestedActive = input.isActive ?? false;
      // First agent in a tenant is always active.
      const isFirst = bucket(tenantId).size === 0;
      const isActive = isFirst || requestedActive;

      if (isActive) {
        for (const existing of bucket(tenantId).values()) {
          if (existing.is_active) {
            existing.is_active = false;
            existing.updated_at = nowIso();
          }
        }
      }

      const agent: Agent = {
        id: randomUUID(),
        tenant_id: tenantId,
        slug,
        name,
        description: input.description?.trim() || null,
        system_prompt: prompt,
        model: input.model ?? 'haiku',
        tools: (input.tools ?? []).filter(Boolean),
        skills: (input.skills ?? []).filter(Boolean),
        is_active: isActive,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      bucket(tenantId).set(agent.id, agent);
      return agent;
    },

    async update(tenantId, id, patch) {
      const existing = bucket(tenantId).get(id);
      if (!existing) return null;

      const willActivate = patch.isActive === true && !existing.is_active;
      const willDeactivate = patch.isActive === false && existing.is_active;

      if (willActivate) {
        for (const other of bucket(tenantId).values()) {
          if (other.id !== id && other.is_active) {
            other.is_active = false;
            other.updated_at = nowIso();
          }
        }
      }
      // Cannot deactivate the only active agent if it is the only agent.
      if (willDeactivate && bucket(tenantId).size === 1) {
        throw new Error('last_active_agent');
      }

      const updated: Agent = {
        ...existing,
        ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
        ...(patch.description !== undefined
          ? { description: patch.description?.trim() || null }
          : {}),
        ...(patch.systemPrompt !== undefined ? { system_prompt: patch.systemPrompt.trim() } : {}),
        ...(patch.model !== undefined ? { model: patch.model } : {}),
        ...(patch.tools !== undefined ? { tools: patch.tools.filter(Boolean) } : {}),
        ...(patch.skills !== undefined ? { skills: patch.skills.filter(Boolean) } : {}),
        ...(patch.isActive !== undefined ? { is_active: patch.isActive } : {}),
        updated_at: nowIso(),
      };
      bucket(tenantId).set(id, updated);
      return updated;
    },

    async remove(tenantId, id) {
      const target = bucket(tenantId).get(id);
      if (!target) return false;
      bucket(tenantId).delete(id);
      // If we removed the active one, promote the oldest remaining (if any).
      if (target.is_active) {
        const remaining = Array.from(bucket(tenantId).values()).sort((a, b) =>
          a.created_at.localeCompare(b.created_at),
        );
        const first = remaining[0];
        if (first) {
          first.is_active = true;
          first.updated_at = nowIso();
        }
      }
      return true;
    },

    async count(tenantId) {
      return bucket(tenantId).size;
    },

    async setActive(tenantId, id) {
      const target = bucket(tenantId).get(id);
      if (!target) return null;
      for (const a of bucket(tenantId).values()) {
        if (a.is_active && a.id !== id) {
          a.is_active = false;
          a.updated_at = nowIso();
        }
      }
      target.is_active = true;
      target.updated_at = nowIso();
      return target;
    },
  };
}
