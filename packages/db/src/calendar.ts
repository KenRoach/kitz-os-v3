import { randomUUID } from 'node:crypto';

export type CalendarEvent = {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  location: string | null;
  /** ISO timestamp. */
  start_at: string;
  /** ISO timestamp; must be >= start_at. */
  end_at: string;
  attendees: string[];
  contact_id: string | null;
  /** Set when synced with an external provider (e.g. Google Calendar). */
  external_provider: 'google' | null;
  external_event_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CalendarEventInput = {
  title: string;
  startAt: string;
  endAt: string;
  description?: string | null;
  location?: string | null;
  attendees?: string[];
  contactId?: string | null;
};

export type CalendarEventPatch = Partial<{
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string;
  attendees: string[];
  contactId: string | null;
}>;

function nowIso(): string {
  return new Date().toISOString();
}

function isIso(s: string): boolean {
  if (typeof s !== 'string') return false;
  const t = Date.parse(s);
  return Number.isFinite(t);
}

export type CalendarStore = {
  list(tenantId: string, opts?: { from?: string; to?: string }): Promise<CalendarEvent[]>;
  get(tenantId: string, id: string): Promise<CalendarEvent | null>;
  create(tenantId: string, input: CalendarEventInput): Promise<CalendarEvent>;
  update(tenantId: string, id: string, patch: CalendarEventPatch): Promise<CalendarEvent | null>;
  remove(tenantId: string, id: string): Promise<boolean>;
  count(tenantId: string): Promise<number>;
};

export function createMemoryCalendarStore(): CalendarStore {
  const byTenant = new Map<string, Map<string, CalendarEvent>>();

  function bucket(tenantId: string): Map<string, CalendarEvent> {
    let b = byTenant.get(tenantId);
    if (!b) {
      b = new Map();
      byTenant.set(tenantId, b);
    }
    return b;
  }

  return {
    async list(tenantId, opts) {
      const all = Array.from(bucket(tenantId).values()).sort((a, b) =>
        a.start_at.localeCompare(b.start_at),
      );
      if (!opts?.from && !opts?.to) return all;
      const from = opts.from ? Date.parse(opts.from) : -Infinity;
      const to = opts.to ? Date.parse(opts.to) : Infinity;
      return all.filter((e) => {
        const s = Date.parse(e.start_at);
        return s >= from && s <= to;
      });
    },

    async get(tenantId, id) {
      return bucket(tenantId).get(id) ?? null;
    },

    async create(tenantId, input) {
      const title = input.title.trim();
      if (title.length < 1 || title.length > 200) throw new Error('invalid_title');
      if (!isIso(input.startAt) || !isIso(input.endAt)) throw new Error('invalid_dates');
      if (Date.parse(input.endAt) < Date.parse(input.startAt)) {
        throw new Error('invalid_dates');
      }
      const event: CalendarEvent = {
        id: randomUUID(),
        tenant_id: tenantId,
        title,
        description: input.description?.trim() || null,
        location: input.location?.trim() || null,
        start_at: input.startAt,
        end_at: input.endAt,
        attendees: (input.attendees ?? []).map((a) => a.trim()).filter(Boolean),
        contact_id: input.contactId ?? null,
        external_provider: null,
        external_event_id: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      bucket(tenantId).set(event.id, event);
      return event;
    },

    async update(tenantId, id, patch) {
      const existing = bucket(tenantId).get(id);
      if (!existing) return null;
      const nextStart = patch.startAt ?? existing.start_at;
      const nextEnd = patch.endAt ?? existing.end_at;
      if (patch.startAt !== undefined && !isIso(patch.startAt)) {
        throw new Error('invalid_dates');
      }
      if (patch.endAt !== undefined && !isIso(patch.endAt)) {
        throw new Error('invalid_dates');
      }
      if (Date.parse(nextEnd) < Date.parse(nextStart)) {
        throw new Error('invalid_dates');
      }
      const updated: CalendarEvent = {
        ...existing,
        ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
        ...(patch.description !== undefined
          ? { description: patch.description?.trim() || null }
          : {}),
        ...(patch.location !== undefined ? { location: patch.location?.trim() || null } : {}),
        ...(patch.startAt !== undefined ? { start_at: patch.startAt } : {}),
        ...(patch.endAt !== undefined ? { end_at: patch.endAt } : {}),
        ...(patch.attendees !== undefined
          ? { attendees: patch.attendees.map((a) => a.trim()).filter(Boolean) }
          : {}),
        ...(patch.contactId !== undefined ? { contact_id: patch.contactId } : {}),
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
