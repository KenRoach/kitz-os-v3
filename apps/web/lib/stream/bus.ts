/**
 * In-memory per-tenant event bus for SSE.
 *
 * One EventBus instance per Node.js process, keyed by tenantId. Each
 * tenant keeps a Set of ReadableStream controllers representing every
 * currently-open SSE connection for that tenant (could be desktop +
 * mobile + a tablet simultaneously).
 *
 * When something server-side wants to notify every connected client
 * for a tenant — WhatsApp inbound, invoice status change, vibe
 * toggle, etc — it calls `bus.emit(tenantId, event)` and the event
 * fans out to every open stream.
 *
 * Scope caveat:
 *   - In-memory only. If you have multiple Node processes (e.g. real
 *     Vercel prod with multiple lambda instances) this bus won't fan
 *     out across them. Swap the impl for Supabase Realtime /
 *     Upstash Redis pub-sub when you productionize — the call sites
 *     (`bus.emit()` / `bus.subscribe()`) don't change.
 *   - Stub/dev uses this as-is. Perfect for single-process `next dev`.
 *
 * Memory safety: every subscribe() returns an unsubscribe fn the SSE
 * route must call in the stream's `cancel` handler, otherwise
 * controllers pile up and leak when clients disconnect.
 */

import type { KitzEvent } from './events';

type Subscriber = (event: KitzEvent) => void;

class EventBus {
  private subscribers = new Map<string, Set<Subscriber>>();

  subscribe(tenantId: string, fn: Subscriber): () => void {
    let set = this.subscribers.get(tenantId);
    if (!set) {
      set = new Set();
      this.subscribers.set(tenantId, set);
    }
    set.add(fn);
    return () => {
      const current = this.subscribers.get(tenantId);
      if (!current) return;
      current.delete(fn);
      if (current.size === 0) this.subscribers.delete(tenantId);
    };
  }

  emit(tenantId: string, event: KitzEvent): void {
    // Fire Web Push in parallel with the SSE fan-out. Push dispatch is
    // async + network-bound; we don't await it because:
    //   1. SSE consumers shouldn't block on push service latency
    //   2. Failed push (expired sub, network blip) must not cause the
    //      SSE emit to throw
    // dispatchPush handles its own errors + no-ops when VAPID isn't
    // configured, so a fire-and-forget is safe here.
    void import('@/lib/push/send').then(({ dispatchPush }) =>
      dispatchPush(tenantId, event).catch(() => {
        // swallowed inside dispatchPush; extra safety here
      }),
    );

    const set = this.subscribers.get(tenantId);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(event);
      } catch {
        // One subscriber throwing must not break the rest of the fan-out.
      }
    }
  }

  /** Exposed for debugging only — do not use in product code. */
  _size(tenantId: string): number {
    return this.subscribers.get(tenantId)?.size ?? 0;
  }
}

// Pin to globalThis so Next.js dev-mode hot reload doesn't recreate the
// bus on every module-graph refresh (which would drop all open SSE
// connections). This is the same pattern Prisma + Next use.
const g = globalThis as unknown as { __kitzEventBus?: EventBus };
export const eventBus: EventBus = g.__kitzEventBus ?? new EventBus();
if (!g.__kitzEventBus) g.__kitzEventBus = eventBus;
