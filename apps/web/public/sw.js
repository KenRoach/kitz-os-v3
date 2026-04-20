/* KitZ Service Worker — handles Web Push delivery when the tab is
 * closed or backgrounded.
 *
 * Scope: root ('/'). Registered by the client via
 * `navigator.serviceWorker.register('/sw.js')`. Browsers cache the SW
 * aggressively; bump CACHE_VERSION whenever this file changes so the
 * update flow fires on users' devices.
 *
 * Events handled:
 *   - push              — incoming payload from the push service.
 *                         Payload shape is the JSON sent by lib/push/send.ts:
 *                         { title, body, url }
 *   - notificationclick — user tapped the system notification.
 *                         Focus an existing KitZ tab if one is open,
 *                         otherwise open a new tab at payload.url.
 */

const CACHE_VERSION = 'kitz-sw-v1';

self.addEventListener('install', (event) => {
  // Take over right away so the user doesn't need to close/reopen.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'KitZ', body: event.data.text(), url: '/workspace' };
  }
  const { title = 'KitZ', body = '', url = '/workspace' } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-badge.png',
      tag: 'kitz-event',
      renotify: true,
      data: { url },
      // Hints at system-level: use the default chime + respect quiet hours.
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/workspace';

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      // If a KitZ window is already open, focus it and navigate.
      for (const client of windowClients) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            try {
              await client.navigate(targetUrl);
            } catch {
              // Some browsers restrict cross-origin navigate; ignore.
            }
          }
          return;
        }
      }
      // Otherwise open a new tab.
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});

// Expose the cache version for debugging in DevTools > Application > SW.
self.addEventListener('message', (event) => {
  if (event.data === 'kitz:version') {
    event.source &&
      event.source.postMessage({ type: 'kitz:version', version: CACHE_VERSION });
  }
});
