/**
 * Dispatch Web Push notifications to every stored subscription for a
 * tenant. Degrades gracefully when the `web-push` package isn't
 * installed or VAPID keys aren't configured — logs once and returns,
 * so the rest of the notification pipeline (SSE, in-app toasts) still
 * works on a bare clone.
 *
 * Env contract:
 *   VAPID_PRIVATE_KEY          — 43-byte base64url, server only
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY — 65-byte base64url, handed to browser
 *   VAPID_SUBJECT              — mailto: or https: URL (spec required)
 *
 * Generate keys once with: npx web-push generate-vapid-keys
 *
 * When a subscription returns 404/410 from the push service, we
 * remove it from the store — that's how the spec signals the user
 * has revoked permission or uninstalled the PWA.
 */

import type { KitzEvent } from '@/lib/stream/events';
import { pushStore } from './store';

type WebPushModule = {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
  sendNotification: (
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
  ) => Promise<{ statusCode: number }>;
};

let cachedModule: WebPushModule | null = null;
let warnedMissing = false;

async function loadWebPush(): Promise<WebPushModule | null> {
  if (cachedModule) return cachedModule;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subj = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !subj) {
    if (!warnedMissing) {
      // eslint-disable-next-line no-console
      console.info('[push] VAPID keys not configured; Web Push disabled');
      warnedMissing = true;
    }
    return null;
  }
  try {
    // Dynamic import via an indirection so TypeScript doesn't try to
    // resolve the module at build time. `web-push` is optional — it's
    // only needed when Web Push is actually turned on (VAPID keys set
    // + package installed). Keeping the import string behind a
    // variable lets `tsc --noEmit` pass on a bare clone.
    const modName: string = 'web-push';
    const mod = (await import(/* webpackIgnore: true */ modName)) as unknown as
      | WebPushModule
      | { default: WebPushModule };
    const wp: WebPushModule = 'default' in mod ? mod.default : mod;
    wp.setVapidDetails(subj, pub, priv);
    cachedModule = wp;
    return wp;
  } catch {
    if (!warnedMissing) {
      // eslint-disable-next-line no-console
      console.info('[push] web-push package not installed; Web Push disabled');
      warnedMissing = true;
    }
    return null;
  }
}

function eventToPayload(event: KitzEvent): { title: string; body: string; url: string } | null {
  switch (event.kind) {
    case 'whatsapp.message':
      return {
        title: `WhatsApp · ${event.from}`,
        body: event.preview.slice(0, 140),
        url: '/workspace/conversaciones',
      };
    case 'invoice.paid':
      return {
        title: `Factura pagada · ${event.number}`,
        body: `${event.currency} ${event.total.toFixed(2)}`,
        url: '/workspace/cotizaciones',
      };
    case 'setup.progress':
      if (event.doneCount === event.total) {
        return {
          title: 'Setup completo',
          body: 'Todos los pasos de configuración están listos.',
          url: '/workspace',
        };
      }
      return null;
    case 'vibe.changed':
    case 'chat.message':
      return null;
    default:
      return null;
  }
}

export async function dispatchPush(tenantId: string, event: KitzEvent): Promise<void> {
  const payload = eventToPayload(event);
  if (!payload) return;
  const wp = await loadWebPush();
  if (!wp) return;

  const subs = pushStore.list(tenantId);
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await wp.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          body,
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // Subscription is dead (revoked / expired) — prune.
          pushStore.remove(tenantId, sub.endpoint);
        }
        // Other errors: transient, let the next event try again.
      }
    }),
  );
}
