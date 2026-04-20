'use client';

/**
 * AlertLayer — a single fixed-position toast stack that subscribes to
 * the tenant SSE stream and pops a notification for every event that
 * should reach the user's attention (WhatsApp inbound, invoice paid,
 * setup progress).
 *
 * Mounted once in workspace/layout.tsx so both desktop and mobile
 * see the same toasts from the same stream — this is the "whatever
 * happens on mobile shows up on desktop" primitive.
 *
 * Design choices:
 *   - Top-center placement so it never collides with the bottom-
 *     centered Setup pill or the mobile tab bar.
 *   - Auto-dismiss after 6s; click to dismiss immediately.
 *   - Sound: soft chime via Web Audio API (no mp3 asset needed) only
 *     for events flagged `audible`. Gated on user-gesture history so
 *     we never violate browser autoplay policies.
 *   - Per-event icon + label derived from the event kind.
 *   - Max 4 simultaneous toasts; older ones evict when the queue
 *     overflows so a spammy WhatsApp burst doesn't stack into the
 *     fold.
 *
 * This is intentionally tiny — no external toast library — because
 * the KitZ design language is flat and we want the toast to feel
 * like part of the ink/paper system, not a drop-in Radix widget.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useStream } from './use-stream';
import type { KitzEvent } from './events';

type Toast = {
  id: string;
  title: string;
  body: string;
  tone: 'info' | 'success' | 'warn';
  audible: boolean;
};

const MAX_TOASTS = 4;
const DISMISS_AFTER_MS = 6000;

function eventToToast(event: KitzEvent): Toast | null {
  const id = `${event.kind}-${event.at}-${Math.random().toString(36).slice(2, 8)}`;
  switch (event.kind) {
    case 'whatsapp.message':
      return {
        id,
        title: `WhatsApp · ${event.from}`,
        body: event.preview.slice(0, 140),
        tone: 'info',
        audible: true,
      };
    case 'invoice.paid':
      return {
        id,
        title: `Factura pagada · ${event.number}`,
        body: `${event.currency} ${event.total.toFixed(2)}`,
        tone: 'success',
        audible: true,
      };
    case 'setup.progress':
      if (event.doneCount === event.total) {
        return {
          id,
          title: 'Setup completo',
          body: 'Todos los pasos de configuración están listos.',
          tone: 'success',
          audible: false,
        };
      }
      return null;
    case 'vibe.changed':
    case 'chat.message':
      // These flow through other UI (vibe picker label, chat thread)
      // and would be noise as toasts.
      return null;
    default:
      return null;
  }
}

function playChime(): void {
  if (typeof window === 'undefined') return;
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  try {
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => void ctx.close();
  } catch {
    // Autoplay policy or unsupported — swallow silently. The toast
    // itself still renders, the user just doesn't get a ding.
  }
}

export function AlertLayer(): React.ReactElement | null {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Track whether the user has interacted with the page. Browsers
  // block sound until a gesture; we respect that by only attempting
  // playback after the first pointerdown/keydown.
  const canPlayRef = useRef(false);

  useEffect(() => {
    const flag = () => {
      canPlayRef.current = true;
    };
    window.addEventListener('pointerdown', flag, { once: true });
    window.addEventListener('keydown', flag, { once: true });
    return () => {
      window.removeEventListener('pointerdown', flag);
      window.removeEventListener('keydown', flag);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  useStream((event) => {
    const toast = eventToToast(event);
    if (!toast) return;
    setToasts((current) => {
      const next = [...current, toast];
      // Evict oldest if we exceed the cap.
      while (next.length > MAX_TOASTS) next.shift();
      return next;
    });
    if (toast.audible && canPlayRef.current) playChime();
    window.setTimeout(() => dismiss(toast.id), DISMISS_AFTER_MS);
  });

  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        pointerEvents: 'none',
        width: 'min(90vw, 22rem)',
      }}
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          style={{
            pointerEvents: 'auto',
            textAlign: 'left',
            background: 'var(--kitz-bg, #F9F6EF)',
            color: 'var(--kitz-ink, #111)',
            border: `1px solid ${
              t.tone === 'success'
                ? 'var(--kitz-moss, #7a8b6f)'
                : t.tone === 'warn'
                  ? 'var(--kitz-danger, #a00)'
                  : 'var(--kitz-ink, #111)'
            }`,
            padding: '0.6rem 0.75rem',
            fontFamily: 'var(--kitz-font-mono, ui-monospace)',
            fontSize: '0.75rem',
            boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
          }}
        >
          <span
            style={{
              fontSize: '0.65rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color:
                t.tone === 'success'
                  ? 'var(--kitz-moss, #7a8b6f)'
                  : t.tone === 'warn'
                    ? 'var(--kitz-danger, #a00)'
                    : 'var(--kitz-ink-2, #444)',
            }}
          >
            {t.title}
          </span>
          <span style={{ fontSize: '0.8rem', lineHeight: 1.35 }}>{t.body}</span>
        </button>
      ))}
    </div>
  );
}
