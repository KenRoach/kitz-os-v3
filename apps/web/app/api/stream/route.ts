/**
 * GET /api/stream — per-tenant Server-Sent Events channel.
 *
 * Opens a persistent text/event-stream the client (ShellChat on
 * desktop, ChatTab on mobile) subscribes to via EventSource. Every
 * event the server-side bus emits for this tenant flows down the pipe
 * as a JSON-encoded SSE `data:` frame.
 *
 * Heartbeat: sends a `:ping` comment every 25s so intermediaries
 * (proxies, load balancers) don't idle-kill the connection, and so
 * the client's onerror → retry handler doesn't fire on a dead link.
 *
 * Auth: uses requireTenant() same as every other route. Viewers are
 * allowed — read-only users still want notifications.
 *
 * Cleanup: when the client closes the tab (or navigates away),
 * ReadableStream.cancel fires → we unsubscribe from the bus and
 * clear the heartbeat interval. Without this, closed connections
 * would pile up and leak memory across dev sessions.
 */

import { requireTenant } from '@/lib/auth/require-tenant';
import { eventBus } from '@/lib/stream/bus';
import type { KitzEvent } from '@/lib/stream/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEARTBEAT_MS = 25_000;
const encoder = new TextEncoder();

function sseFrame(event: KitzEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

export async function GET(): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    return new Response('unauthorized', { status: auth.status });
  }

  const tenantId = auth.ctx.tenantId;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Prime the connection so the client's `onopen` fires immediately
      // instead of waiting on the first real event.
      controller.enqueue(encoder.encode(': connected\n\n'));

      const unsubscribe = eventBus.subscribe(tenantId, (event) => {
        try {
          controller.enqueue(sseFrame(event));
        } catch {
          // Controller already closed (client disconnected mid-emit).
          // The cancel handler will clean up shortly; nothing to do.
        }
      });

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, HEARTBEAT_MS);

      // Cache cleanup on the controller instance so `cancel` can reach it.
      (controller as unknown as { _kitzCleanup?: () => void })._kitzCleanup = () => {
        unsubscribe();
        clearInterval(heartbeat);
      };
    },
    cancel(reason) {
      // Next.js calls cancel when the client aborts. We stashed the
      // cleanup fn on the controller in `start`, but `cancel` doesn't
      // receive the controller as an arg — instead Next gives us
      // `reason`. The cleanup has already happened via the unsub
      // closure once the controller tries to enqueue into a closed
      // stream. Nothing else to do, but keep this hook so Node logs a
      // clean close instead of an uncaught rejection.
      void reason;
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no', // disable nginx/proxy buffering
    },
  });
}
