'use client';

import { useState } from 'react';
import type { ReportsBundle } from '@/lib/reports/aggregations';

type Props = {
  bundle: ReportsBundle;
};

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; text: string; cost: number }
  | { kind: 'error'; reason: string };

/**
 * AI insight card — calls /api/reports/insight, which formats the
 * aggregations bundle into a Spanish prompt and runs it against the
 * tenant's active agent. Costs 2 credits per call (same as a chat
 * message). Shows a "Generar" button on first load so the user opts
 * into the spend rather than paying every time the page renders.
 */
export default function InsightCard({ bundle }: Props) {
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function generate() {
    setState({ kind: 'loading' });
    try {
      const r = await fetch('/api/reports/insight', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bundle }),
      });
      if (r.status === 402) {
        setState({ kind: 'error', reason: 'Sin créditos para generar.' });
        return;
      }
      const j = (await r.json()) as {
        success: boolean;
        data: { text: string; cost: number } | null;
        error: string | null;
      };
      if (!j.success || !j.data) {
        setState({ kind: 'error', reason: j.error ?? 'No pude generar el resumen.' });
        return;
      }
      setState({ kind: 'ok', text: j.data.text, cost: j.data.cost });
    } catch {
      setState({ kind: 'error', reason: 'Error de red.' });
    }
  }

  return (
    <section
      className="kz-panel"
      style={{
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        borderLeft: '3px solid var(--kitz-accent-gold)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}
      >
        <h2 style={{ fontSize: '1rem', margin: 0 }}>Insight con KitZ</h2>
        <span
          style={{
            fontSize: '0.6rem',
            color: 'var(--kitz-ink-3)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          AI · 2 créditos
        </span>
      </header>

      {state.kind === 'idle' && (
        <>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--kitz-ink-2)' }}>
            Pide a KitZ un resumen de los reportes en lenguaje natural — qué
            cambió, qué sigue, qué necesita atención.
          </p>
          <button
            type="button"
            onClick={generate}
            style={{
              alignSelf: 'flex-start',
              padding: '0.4rem 0.85rem',
              fontSize: '0.7rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontWeight: 600,
              color: 'var(--kitz-bg)',
              background: 'var(--kitz-ink)',
              border: '1px solid var(--kitz-line-strong)',
              cursor: 'pointer',
            }}
          >
            Generar resumen
          </button>
        </>
      )}

      {state.kind === 'loading' && (
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--kitz-ink-3)' }}>
          KitZ está pensando…
        </p>
      )}

      {state.kind === 'ok' && (
        <>
          <p
            style={{
              margin: 0,
              fontSize: '0.9rem',
              lineHeight: 1.6,
              color: 'var(--kitz-ink)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {state.text}
          </p>
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              fontSize: '0.7rem',
              color: 'var(--kitz-ink-3)',
            }}
          >
            <span>−{state.cost} cr</span>
            <button
              type="button"
              onClick={generate}
              style={{
                padding: '0.2rem 0.5rem',
                fontSize: '0.65rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--kitz-ink-2)',
                background: 'transparent',
                border: '1px solid var(--kitz-line)',
                cursor: 'pointer',
                fontFamily: 'var(--kitz-font-mono)',
              }}
            >
              Regenerar
            </button>
          </div>
        </>
      )}

      {state.kind === 'error' && (
        <>
          <p
            style={{
              margin: 0,
              fontSize: '0.85rem',
              color: 'var(--kitz-danger)',
            }}
          >
            {state.reason}
          </p>
          <button
            type="button"
            onClick={generate}
            style={{
              alignSelf: 'flex-start',
              padding: '0.3rem 0.75rem',
              fontSize: '0.7rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontWeight: 600,
              color: 'var(--kitz-ink)',
              background: 'var(--kitz-bg)',
              border: '1px solid var(--kitz-line-strong)',
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </>
      )}
    </section>
  );
}
