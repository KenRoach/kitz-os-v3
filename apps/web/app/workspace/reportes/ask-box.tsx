'use client';

/**
 * AskBox — freeform "Preguntale a tus datos" surface on Reportes.
 *
 * Takes the current bundle + extra payloads (already rendered into
 * the dashboard cards) and posts them alongside the user's question
 * to /api/reports/ask. The endpoint hands the data + question to the
 * active agent, which returns a short Spanish answer plus an
 * optional chart spec we render inline with the same primitives the
 * fixed cards use.
 *
 * Design:
 *   - Single textarea + "Preguntar" button
 *   - Sample questions as clickable chips to give users starting
 *     points instead of staring at an empty box
 *   - Answer renders in a monospace-styled panel below the input,
 *     with the optional chart in a bordered subpanel
 *   - Loading + error states inline; no modal
 *   - Costs 3 credits per ask; UI surfaces this after each answer
 *     so the user knows the billing impact
 */

import { useState } from 'react';
import type { ReportsBundle } from '@/lib/reports/aggregations';
import type { ExtraBundle } from '@/lib/reports/extra-aggregations';
import type { ChartSpec } from '@/app/api/reports/ask/route';
import { Sparkline, MiniBars, Funnel } from '@/lib/reports/charts';

type AskResponse = {
  success: boolean;
  data: { answer: string; chart: ChartSpec | null; cost: number } | null;
  error: string | null;
};

const SAMPLE_QUESTIONS: string[] = [
  '¿Cómo se ven mis ingresos de los últimos 6 meses?',
  '¿Qué facturas debo priorizar esta semana?',
  '¿Cuál es mi producto más rentable?',
  '¿Cuánto tiempo toma cerrar un trato?',
];

export default function AskBox({
  bundle,
  extra,
}: {
  bundle: ReportsBundle;
  extra: ExtraBundle;
}) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [chart, setChart] = useState<ChartSpec | null>(null);
  const [cost, setCost] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/reports/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: trimmed, bundle, extra }),
      });
      if (r.status === 402) {
        setError('Sin créditos. Recarga tu batería para seguir preguntando.');
        setAnswer(null);
        setChart(null);
        setCost(null);
        return;
      }
      const j = (await r.json()) as AskResponse;
      if (!r.ok || !j.success || !j.data) {
        setError(j.error ?? 'ask_failed');
        return;
      }
      setAnswer(j.data.answer);
      setChart(j.data.chart);
      setCost(j.data.cost);
    } catch {
      setError('Error de red. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      aria-label="Preguntale a tus datos"
      style={{
        border: '1px solid #000',
        background: '#fff',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <header>
        <p
          className="kz-mute"
          style={{
            margin: 0,
            fontSize: '0.65rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontFamily: 'var(--kitz-font-mono, ui-monospace)',
          }}
        >
          preguntale a tus datos
        </p>
        <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: '#666' }}>
          Kitz responde con números reales de tu periodo seleccionado.
          {cost !== null ? ` Última consulta: ${cost} cr.` : ''}
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
        style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}
      >
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ej: ¿Qué producto debería dejar de ofrecer?"
          maxLength={500}
          rows={2}
          style={{
            flex: 1,
            padding: '0.5rem',
            border: '1px solid #000',
            fontSize: '0.8rem',
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: '2.4rem',
          }}
        />
        <button
          type="submit"
          disabled={loading || question.trim().length < 3}
          style={{
            background: '#000',
            color: '#fff',
            border: '1px solid #000',
            padding: '0.4rem 0.9rem',
            fontSize: '0.75rem',
            cursor: loading ? 'wait' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? 'Pensando…' : 'Preguntar'}
        </button>
      </form>

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {SAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => {
              setQuestion(q);
              void ask(q);
            }}
            disabled={loading}
            style={{
              background: '#fafafa',
              border: '1px dashed #999',
              padding: '0.25rem 0.55rem',
              fontSize: '0.7rem',
              cursor: loading ? 'wait' : 'pointer',
              color: '#333',
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {error ? (
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#a00' }}>Error: {error}</p>
      ) : null}

      {answer ? (
        <article
          style={{
            border: '1px solid #e5e2da',
            padding: '0.75rem 0.85rem',
            background: '#fbfaf5',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '0.85rem',
              lineHeight: 1.55,
              whiteSpace: 'pre-line',
            }}
          >
            {answer}
          </p>
          {chart ? (
            <div
              style={{
                borderTop: '1px solid #e5e2da',
                paddingTop: '0.6rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '0.65rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#888',
                  fontFamily: 'var(--kitz-font-mono, ui-monospace)',
                }}
              >
                {chart.title}
              </p>
              {chart.type === 'sparkline' ? (
                <Sparkline values={chart.values} tone={chart.tone ?? 'ink'} height={56} />
              ) : null}
              {chart.type === 'bars' ? (
                <MiniBars items={chart.items} tone={chart.tone ?? 'ink'} height={70} />
              ) : null}
              {chart.type === 'funnel' ? (
                <Funnel stages={chart.stages} tone={chart.tone ?? 'ink'} />
              ) : null}
            </div>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
