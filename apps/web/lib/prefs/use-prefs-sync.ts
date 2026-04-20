'use client';

/**
 * usePrefsSync — mount once per shell (desktop + mobile). It:
 *
 *   1. Pulls /api/prefs on mount so localStorage picks up whatever the
 *      other device set.
 *   2. Re-pulls whenever the SSE stream reports a vibe.changed event
 *      from a different device (same-device events are ignored to
 *      avoid feedback loops).
 *   3. Pulls again on window focus — covers the "phone was backgrounded,
 *      user just returned" case where SSE may have been disconnected.
 *
 * The hook does not expose any state — it just keeps localStorage in
 * sync and dispatches the kitz-*-change CustomEvents the existing
 * pickers already listen to. That means every vibe / voice / lang
 * picker in the app gets cross-device sync for free.
 */

import { useEffect } from 'react';
import { pullPrefs } from './client';
import { useStream } from '@/lib/stream/use-stream';

export function usePrefsSync(
  tenantSlug: string,
  device: 'desktop' | 'mobile' = 'desktop',
): void {
  useEffect(() => {
    void pullPrefs(tenantSlug);
    const onFocus = () => void pullPrefs(tenantSlug);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [tenantSlug]);

  useStream((event) => {
    if (event.kind !== 'vibe.changed') return;
    if (event.fromDevice === device) return;
    void pullPrefs(tenantSlug);
  });
}
