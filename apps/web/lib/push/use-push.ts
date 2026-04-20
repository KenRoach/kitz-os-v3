'use client';

/**
 * usePush — client hook that manages the full Web Push lifecycle:
 *
 *   1. Detect browser support (serviceWorker + PushManager + Notification)
 *   2. Register /sw.js on first use
 *   3. Expose current permission state ('default' | 'granted' | 'denied' | 'unsupported')
 *   4. enable()  → request permission, subscribe to PushManager, POST to /api/push/subscribe
 *   5. disable() → unsubscribe locally, POST to /api/push/unsubscribe
 *
 * Keeps the UI surface tiny — a single button that flips between
 * "Activar alertas" and "Desactivar alertas" based on `state`.
 *
 * The VAPID public key is read from NEXT_PUBLIC_VAPID_PUBLIC_KEY. If
 * missing, the hook reports 'unsupported' and enable() is a no-op —
 * consistent with the server-side Web Push degrading when VAPID
 * isn't configured.
 */

import { useCallback, useEffect, useState } from 'react';

type PushState = 'unsupported' | 'default' | 'granted' | 'denied';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export function usePush(device: 'desktop' | 'mobile' = 'desktop'): {
  state: PushState;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
} {
  const [state, setState] = useState<PushState>('unsupported');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (
      !publicKey ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      setState('unsupported');
      return;
    }
    setState(Notification.permission as PushState);
  }, []);

  const enable = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // Request permission (no-op if already granted).
    const permission = await Notification.requestPermission();
    setState(permission as PushState);
    if (permission !== 'granted') return;

    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    const json = sub.toJSON() as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        device,
      }),
    });
  }, [device]);

  const disable = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const endpoint = sub.endpoint;
    await sub.unsubscribe().catch(() => {
      // Browsers occasionally fail to unsubscribe locally; we still
      // tell the server so it stops dispatching.
    });
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });
    setState('default');
  }, []);

  return { state, enable, disable };
}
