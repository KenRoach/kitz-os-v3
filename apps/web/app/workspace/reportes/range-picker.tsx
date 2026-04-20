'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

const PRESETS = [
  { id: 'today', label: 'Hoy' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: '90d', label: '90 días' },
] as const;

/**
 * Range picker for /workspace/reportes. Reads ?range=<preset> from the
 * URL and pushes a new value via router. Server component re-runs the
 * aggregations against the new range. Wrapped in useTransition so the
 * UI doesn't block while the server fetches.
 */
export default function RangePicker() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get('range') ?? '30d';
  const [pending, startTransition] = useTransition();

  function setRange(id: string) {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set('range', id);
    startTransition(() => {
      router.push(`/workspace/reportes?${params.toString()}`);
    });
  }

  return (
    <div
      role="tablist"
      aria-label="Rango de fechas"
      style={{
        display: 'inline-flex',
        border: '1px solid var(--kitz-line-strong)',
        background: 'var(--kitz-bg)',
        opacity: pending ? 0.6 : 1,
        transition: 'opacity 120ms ease',
      }}
    >
      {PRESETS.map((p, i) => {
        const active = p.id === current;
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setRange(p.id)}
            disabled={pending}
            style={{
              padding: '0.4rem 0.85rem',
              border: 'none',
              borderRight:
                i < PRESETS.length - 1 ? '1px solid var(--kitz-line)' : 'none',
              background: active ? 'var(--kitz-ink)' : 'transparent',
              color: active ? 'var(--kitz-bg)' : 'var(--kitz-ink-2)',
              fontFamily: 'var(--kitz-font-mono)',
              fontSize: '0.7rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: active ? 600 : 500,
              cursor: pending ? 'wait' : 'pointer',
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
