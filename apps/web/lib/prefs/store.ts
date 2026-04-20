/**
 * Tenant + user scoped preferences store.
 *
 * Holds the small pile of per-user UI state that should travel across
 * devices: vibe, voice, language. These were originally kept in
 * localStorage keyed by tenantSlug, which meant mobile and desktop
 * picked their own defaults. Now localStorage becomes a warm cache
 * and this store is the source of truth.
 *
 * Scope: in-memory, per Node process, pinned to globalThis so Next
 * dev HMR doesn't lose state. Survives the lifetime of the server
 * instance. Graduate to a `user_preferences` DB table when you
 * stand up Supabase for real.
 *
 * Shape: keyed by (tenantId, userId). One row per user per tenant.
 * Preferences are keyed by kind so we can add more without bumping
 * the surface area (e.g. 'theme', 'density' later).
 */

export type PrefKind = 'vibe' | 'voice' | 'lang';

export type PrefRecord = {
  tenantId: string;
  userId: string;
  kind: PrefKind;
  value: string;
  updatedAt: string;
};

function key(tenantId: string, userId: string, kind: PrefKind): string {
  return `${tenantId}::${userId}::${kind}`;
}

class PrefsStore {
  private rows = new Map<string, PrefRecord>();

  get(tenantId: string, userId: string, kind: PrefKind): PrefRecord | null {
    return this.rows.get(key(tenantId, userId, kind)) ?? null;
  }

  /** Return every pref for (tenant, user) so the client can hydrate in one call. */
  listForUser(tenantId: string, userId: string): PrefRecord[] {
    const out: PrefRecord[] = [];
    for (const r of this.rows.values()) {
      if (r.tenantId === tenantId && r.userId === userId) out.push(r);
    }
    return out;
  }

  set(tenantId: string, userId: string, kind: PrefKind, value: string): PrefRecord {
    const rec: PrefRecord = {
      tenantId,
      userId,
      kind,
      value,
      updatedAt: new Date().toISOString(),
    };
    this.rows.set(key(tenantId, userId, kind), rec);
    return rec;
  }
}

const g = globalThis as unknown as { __kitzPrefsStore?: PrefsStore };
export const prefsStore: PrefsStore = g.__kitzPrefsStore ?? new PrefsStore();
if (!g.__kitzPrefsStore) g.__kitzPrefsStore = prefsStore;
