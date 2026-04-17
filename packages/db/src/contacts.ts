import { randomUUID } from 'node:crypto';

export type Contact = {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  tags: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ContactInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  tags?: string[];
  notes?: string | null;
};

export type ContactPatch = Partial<ContactInput>;

function nowIso(): string {
  return new Date().toISOString();
}

export type ContactsStore = {
  list(
    tenantId: string,
    opts?: { query?: string; limit?: number; offset?: number },
  ): Promise<{ items: Contact[]; total: number }>;
  get(tenantId: string, id: string): Promise<Contact | null>;
  create(tenantId: string, input: ContactInput): Promise<Contact>;
  update(tenantId: string, id: string, patch: ContactPatch): Promise<Contact | null>;
  remove(tenantId: string, id: string): Promise<boolean>;
  count(tenantId: string): Promise<number>;
};

/**
 * In-memory Contacts store used by the stub DbClient. Behaviour mirrors what
 * the real Supabase implementation must provide.
 */
export function createMemoryContactsStore(): ContactsStore {
  const byTenant = new Map<string, Map<string, Contact>>();

  function bucket(tenantId: string): Map<string, Contact> {
    let b = byTenant.get(tenantId);
    if (!b) {
      b = new Map();
      byTenant.set(tenantId, b);
    }
    return b;
  }

  function matches(c: Contact, q: string): boolean {
    const haystack = [c.name, c.email ?? '', c.phone ?? '', c.company ?? '', c.tags.join(' ')]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  }

  return {
    async list(tenantId, opts) {
      const all = Array.from(bucket(tenantId).values()).sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      );
      const q = opts?.query?.trim().toLowerCase();
      const filtered = q ? all.filter((c) => matches(c, q)) : all;
      const offset = Math.max(0, opts?.offset ?? 0);
      const limit = Math.min(200, Math.max(1, opts?.limit ?? 50));
      return { items: filtered.slice(offset, offset + limit), total: filtered.length };
    },

    async get(tenantId, id) {
      return bucket(tenantId).get(id) ?? null;
    },

    async create(tenantId, input) {
      const name = input.name.trim();
      if (name.length < 1 || name.length > 200) throw new Error('invalid_name');
      const contact: Contact = {
        id: randomUUID(),
        tenant_id: tenantId,
        name,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        company: input.company?.trim() || null,
        tags: (input.tags ?? []).map((t) => t.trim()).filter(Boolean),
        notes: input.notes?.trim() || null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      bucket(tenantId).set(contact.id, contact);
      return contact;
    },

    async update(tenantId, id, patch) {
      const existing = bucket(tenantId).get(id);
      if (!existing) return null;
      const updated: Contact = {
        ...existing,
        ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
        ...(patch.email !== undefined ? { email: patch.email?.trim() || null } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone?.trim() || null } : {}),
        ...(patch.company !== undefined ? { company: patch.company?.trim() || null } : {}),
        ...(patch.tags !== undefined
          ? { tags: patch.tags.map((t) => t.trim()).filter(Boolean) }
          : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes?.trim() || null } : {}),
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
