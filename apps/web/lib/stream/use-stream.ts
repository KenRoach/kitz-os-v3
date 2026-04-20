'use client';

/**
 * useStream — client hook that subscribes to /api/stream via
 * EventSource and invokes a handler for every KitzEvent the server
 * emits for this tenant.
 *
 * Lifecycle:
 *   - Opens EventSource on mount
 *   - Reconnects automatically (EventSource does this natively)
 *   - Closes on unmount
 *
 * The hook is stable across re-renders — we stash the handler in a
 * ref so callers don't need to memoize with useCallback for the
 * subscription to stay stable. One EventSource per component that
 * uses the hook; we accept that cost because SSE connections are
 * cheap and the alternative (singleton broker) makes strict-mode
 * double-mount semantics hard to reason about.
 *
 * SSR-safe: bails out when `window` is undefined.
 */

import { useEffect, useRef } from 'react';
import type { KitzEvent } from './events';

export function useStream(onEvent: (event: KitzEvent) => void): void {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof EventSource === 'undefined') return;

    const es = new EventSource('/api/stream');

    es.onmessage = (msg) => {
      if (!msg.data || typeof msg.data !== 'string') return;
      try {
        const parsed = JSON.parse(msg.data) as KitzEvent;
        handlerRef.current(parsed);
      } catch {
        // Ignore malformed frames — heartbeats come through as
        // comments (`: ping`) which EventSource filters before this
        // handler, so anything reaching us should be JSON.
      }
    };

    // onerror fires on reconnect attempts too, which EventSource
    // handles automatically. We intentionally don't close() on error
    // because that would disable the native retry behavior.
    es.onerror = () => {
      // Noop — let EventSource retry. If you ever need to expose
      // connection state to the UI, do it via a separate ref +
      // useState and update here.
    };

    return () => {
      es.close();
    };
  }, []);
}
