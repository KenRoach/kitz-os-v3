'use client';

import type { Deal } from '@kitz/db';
import type { DealStage } from '@kitz/db/deal-stages';

type Props = {
  stages: readonly DealStage[];
  deals: Deal[];
  summary: Record<DealStage, { count: number; total: number }> | null;
  onMove: (dealId: string, stage: DealStage) => void;
  onDelete: (dealId: string) => void;
};

const STAGE_LABELS: Record<DealStage, string> = {
  prospecto: 'Prospecto',
  calificado: 'Calificado',
  propuesta: 'Propuesta',
  negociacion: 'Negociación',
  ganado: 'Ganado',
  perdido: 'Perdido',
};

function formatMoney(amount: number, currency: string): string {
  return `${currency} ${Math.round(amount).toLocaleString()}`;
}

export default function DealPipeline({ stages, deals, summary, onMove, onDelete }: Props) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${stages.length}, minmax(14rem, 1fr))`,
        gap: '0.75rem',
        overflowX: 'auto',
      }}
    >
      {stages.map((stage) => {
        const col = deals.filter((d) => d.stage === stage);
        const agg = summary?.[stage];
        return (
          <div
            key={stage}
            style={{
              border: '1px solid var(--kitz-border)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '22rem',
              background: 'var(--kitz-bg)',
            }}
          >
            <header
              style={{
                padding: '0.625rem 0.75rem',
                borderBottom: '1px solid var(--kitz-border)',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--kitz-text-strong)',
                }}
              >
                {STAGE_LABELS[stage]}
              </p>
              <p className="kz-mute" style={{ margin: 0, fontSize: '0.7rem' }}>
                {agg ? `${agg.count} · ${formatMoney(agg.total, 'USD')}` : '0'}
              </p>
            </header>

            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: '0.5rem',
                display: 'grid',
                gap: '0.5rem',
              }}
            >
              {col.length === 0 && (
                <li
                  className="kz-mute"
                  style={{ fontSize: '0.75rem', textAlign: 'center', padding: '2rem 0' }}
                >
                  —
                </li>
              )}
              {col.map((d) => (
                <li
                  key={d.id}
                  style={{
                    border: '1px solid var(--kitz-border)',
                    padding: '0.625rem',
                    background: 'var(--kitz-bg)',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.8125rem',
                      color: 'var(--kitz-text-strong)',
                    }}
                  >
                    {d.title}
                  </p>
                  <p className="kz-mute" style={{ margin: '0.25rem 0 0 0', fontSize: '0.7rem' }}>
                    {formatMoney(d.amount, d.currency)} · {d.probability}%
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.25rem',
                      marginTop: '0.5rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <select
                      value={d.stage}
                      onChange={(e) => onMove(d.id, e.target.value as DealStage)}
                      className="kz-input"
                      style={{ fontSize: '0.7rem', padding: '0.25rem' }}
                    >
                      {stages.map((s) => (
                        <option key={s} value={s}>
                          {STAGE_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => onDelete(d.id)}
                      className="kz-kbd"
                      style={{ cursor: 'pointer', fontSize: '0.65rem' }}
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
