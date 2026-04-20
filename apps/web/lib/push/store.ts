/**
 * In-process store of Web Push subscriptions keyed by tenantId.
 *
 * Same lifetime shape as `lib/stream/bus.ts`: pinned to globalThis
 * so Next dev HMR doesn't drop subscriptions, loses state on server
 * restart. Swap for a `push_subscriptions` DB table when you move
 * past single-process dev.
 *
 * A PushSubscription is the JSON shape the browser's PushManager
 * produces after `pushManager.subscribe()`. We store the full
 * envelope because `web-push` (the server-side dispatcher) needs
 * endpoint + p256dh + auth to encrypt the payload.
 */

export type StoredPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  /** Which shell registered this subscription — useful for debugging. */
  device: 'desktop' | 'mobile';
  /** When the subscription was registered (ISO). */
  createdAt: string;
};

type TenantSubs = Map<string /* endpoint */, StoredPushSubscription>;

class PushStore {
  private byTenant = new Map<string, TenantSubs>();

  add(tenantId: string, sub: StoredPushSubscription): void {
    let t = this.byTenant.get(tenantId);
    if (!t) {
      t = new Map();
      this.byTenant.set(tenantId, t);
    }
    t.set(sub.endpoint, sub);
  }

  remove(tenantId: string, endpoint: string): void {
    const t = this.byTenant.get(tenantId);
    if (!t) return;
    t.delete(endpoint);
    if (t.size === 0) this.byTenant.delete(tenantId);
  }

  list(tenantId: string): StoredPushSubscription[] {
    return Array.from(this.byTenant.get(tenantId)?.values() ?? []);
  }
}

const g = globalThis as unknown as { __kitzPushStore?: PushStore };
export const pushStore: PushStore = g.__kitzPushStore ?? new PushStore();
if (!g.__kitzPushStore) g.__kitzPushStore = pushStore;
