import { randomUUID } from 'node:crypto';
import { SKILL_KINDS, type SkillKind } from './skill-kinds';

export { SKILL_KINDS };
export type { SkillKind };

export type Skill = {
  id: string;
  tenant_id: string;
  slug: string;
  name: string;
  description: string | null;
  kind: SkillKind;
  /**
   * Where the skill lives. For mcp_file: a URL or path to the MCP server's
   * SKILL.md / handler. For prompt_chain: a stored chain id. For webhook: an
   * HTTPS endpoint. Validated narrowly per kind in higher layers.
   */
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type SkillInput = {
  slug: string;
  name: string;
  kind: SkillKind;
  source: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
};

export type SkillPatch = Partial<{
  name: string;
  description: string | null;
  kind: SkillKind;
  source: string;
  metadata: Record<string, unknown>;
}>;

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

function nowIso(): string {
  return new Date().toISOString();
}

function validateSource(kind: SkillKind, source: string): boolean {
  const trimmed = source.trim();
  if (trimmed.length === 0 || trimmed.length > 2000) return false;
  if (kind === 'webhook') {
    try {
      const u = new URL(trimmed);
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
      return false;
    }
  }
  // mcp_file and prompt_chain accept any non-empty token; specific schema
  // checks are the caller's responsibility once we wire real MCP loading.
  return true;
}

export type SkillsStore = {
  list(tenantId: string): Promise<Skill[]>;
  get(tenantId: string, id: string): Promise<Skill | null>;
  getBySlug(tenantId: string, slug: string): Promise<Skill | null>;
  create(tenantId: string, input: SkillInput): Promise<Skill>;
  update(tenantId: string, id: string, patch: SkillPatch): Promise<Skill | null>;
  remove(tenantId: string, id: string): Promise<boolean>;
  count(tenantId: string): Promise<number>;
};

export function createMemorySkillsStore(): SkillsStore {
  const byTenant = new Map<string, Map<string, Skill>>();

  function bucket(tenantId: string): Map<string, Skill> {
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
      for (const s of bucket(tenantId).values()) {
        if (s.slug === slug) return s;
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
      if (!validateSource(input.kind, input.source)) throw new Error('invalid_source');
      for (const s of bucket(tenantId).values()) {
        if (s.slug === slug) throw new Error('slug_taken');
      }

      const skill: Skill = {
        id: randomUUID(),
        tenant_id: tenantId,
        slug,
        name,
        description: input.description?.trim() || null,
        kind: input.kind,
        source: input.source.trim(),
        metadata: input.metadata ?? {},
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      bucket(tenantId).set(skill.id, skill);
      return skill;
    },

    async update(tenantId, id, patch) {
      const existing = bucket(tenantId).get(id);
      if (!existing) return null;
      const nextKind = patch.kind ?? existing.kind;
      if (patch.source !== undefined && !validateSource(nextKind, patch.source)) {
        throw new Error('invalid_source');
      }
      const updated: Skill = {
        ...existing,
        ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
        ...(patch.description !== undefined
          ? { description: patch.description?.trim() || null }
          : {}),
        ...(patch.kind !== undefined ? { kind: patch.kind } : {}),
        ...(patch.source !== undefined ? { source: patch.source.trim() } : {}),
        ...(patch.metadata !== undefined ? { metadata: patch.metadata } : {}),
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
  };
}
