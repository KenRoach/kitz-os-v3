/**
 * Zero-dependency SVG chart primitives for the Reportes dashboard.
 *
 * Why not Recharts / Nivo / Visx: the Reportes cards render 6 small
 * visualizations at once. Pulling in a charting framework adds
 * 80-150kB to the workspace bundle for shapes we can draw in 40
 * lines of SVG. These primitives stay server-component-friendly
 * (no client hooks needed) which lets them render inline with the
 * aggregation payload on the server.
 *
 * Visual language:
 *   - Monochrome by default; optional `accent` prop for emphasis.
 *   - No axis labels, no legends — the surrounding card provides
 *     context. These are informational sparkline-scale charts, not
 *     decision-grade visualizations.
 *   - 100% responsive via preserveAspectRatio so they work from
 *     mobile (320px) to desktop (72rem) without media queries.
 */

import type { CSSProperties } from 'react';

const INK = '#111';
const MUTE = '#999';
const MOSS = '#7a8b6f';
const DANGER = '#a00';

type Tone = 'ink' | 'moss' | 'danger' | 'mute';

const TONE_COLOR: Record<Tone, string> = {
  ink: INK,
  moss: MOSS,
  danger: DANGER,
  mute: MUTE,
};

/**
 * Sparkline — single series line chart for a small numeric series.
 * Caller supplies the values array; we auto-scale to min/max.
 * Flat series render as a muted baseline instead of dividing by zero.
 */
export function Sparkline({
  values,
  tone = 'ink',
  height = 36,
  style,
}: {
  values: number[];
  tone?: Tone;
  height?: number;
  style?: CSSProperties;
}): React.ReactElement {
  if (values.length === 0) {
    return <div style={{ height, ...style }} aria-hidden />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const w = 100;
  const h = 30;
  const range = max - min;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const y = (v: number) => (range === 0 ? h / 2 : h - ((v - min) / range) * h);
  const d = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${y(v)}`)
    .join(' ');
  const color = TONE_COLOR[tone];
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      style={{ display: 'block', ...style }}
      aria-hidden
    >
      <path d={d} fill="none" stroke={color} strokeWidth={1.4} />
      {values.length > 0 ? (
        <circle cx={(values.length - 1) * step} cy={y(values[values.length - 1]!)} r={1.8} fill={color} />
      ) : null}
    </svg>
  );
}

/**
 * MiniBars — tiny bar chart for comparing a short list of categories.
 * Labels render below the bars as flexbox text, not inside the SVG,
 * so long labels don't get clipped or force weird viewBox math.
 */
export function MiniBars({
  items,
  height = 60,
  tone = 'ink',
  style,
}: {
  items: { label: string; value: number }[];
  height?: number;
  tone?: Tone;
  style?: CSSProperties;
}): React.ReactElement {
  if (items.length === 0) {
    return <div style={{ height, ...style }} aria-hidden />;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  const color = TONE_COLOR[tone];
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.3rem',
        ...style,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${items.length}, 1fr)`,
          alignItems: 'flex-end',
          gap: '0.3rem',
          height,
        }}
      >
        {items.map((it, i) => {
          const ratio = max === 0 ? 0 : it.value / max;
          return (
            <div
              key={i}
              title={`${it.label}: ${it.value}`}
              style={{
                background: color,
                height: `${Math.max(ratio * 100, 1)}%`,
                minHeight: 1,
              }}
              aria-label={`${it.label}: ${it.value}`}
            />
          );
        })}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${items.length}, 1fr)`,
          gap: '0.3rem',
          fontSize: '0.55rem',
          color: MUTE,
          textAlign: 'center',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {items.map((it, i) => (
          <span
            key={i}
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {it.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Funnel — horizontal bars sized to the largest category, useful
 * for pipeline-stage visualizations.
 */
export function Funnel({
  stages,
  tone = 'ink',
}: {
  stages: { label: string; count: number }[];
  tone?: Tone;
}): React.ReactElement {
  if (stages.length === 0) {
    return <div style={{ height: 40 }} aria-hidden />;
  }
  const max = Math.max(...stages.map((s) => s.count), 1);
  const color = TONE_COLOR[tone];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      {stages.map((s, i) => {
        const ratio = max === 0 ? 0 : s.count / max;
        return (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '5rem 1fr 2rem',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.7rem',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span
              style={{
                color: MUTE,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {s.label}
            </span>
            <div
              style={{
                background: color,
                height: 10,
                width: `${Math.max(ratio * 100, 1)}%`,
                minWidth: 2,
              }}
              aria-hidden
            />
            <span style={{ textAlign: 'right' }}>{s.count}</span>
          </div>
        );
      })}
    </div>
  );
}
