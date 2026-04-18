'use client';

import type { Agent } from '@kitz/db';

type Props = {
  agents: Agent[];
  activeId: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onActivate: (id: string) => void;
};

export default function AgentList({ agents, activeId, selectedId, onSelect, onActivate }: Props) {
  if (agents.length === 0) {
    return (
      <div className="kz-panel" style={{ padding: '1rem' }}>
        <p className="kz-mute">Sin agentes. Crea el primero arriba.</p>
      </div>
    );
  }

  return (
    <ul
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        border: '1px solid var(--kitz-border)',
        maxHeight: '36rem',
        overflowY: 'auto',
      }}
    >
      {agents.map((a) => {
        const active = a.id === activeId;
        const selected = a.id === selectedId;
        return (
          <li
            key={a.id}
            style={{
              borderBottom: '1px solid var(--kitz-border)',
              background: selected ? 'var(--kitz-muted)' : 'var(--kitz-bg)',
              borderLeft: selected ? '2px solid var(--kitz-accent)' : '2px solid transparent',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              padding: '0.65rem 0.75rem',
              cursor: 'pointer',
            }}
            onClick={() => onSelect(a.id)}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: '0.5rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--kitz-text-strong)',
                  fontWeight: 600,
                }}
              >
                {a.name}
              </span>
              {active ? (
                <span
                  className="kz-kbd"
                  style={{
                    fontSize: '0.55rem',
                    background: 'var(--kitz-text-strong)',
                    color: 'var(--kitz-bg)',
                    border: 'none',
                  }}
                >
                  ACTIVO
                </span>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onActivate(a.id);
                  }}
                  className="kz-kbd"
                  style={{
                    cursor: 'pointer',
                    fontSize: '0.55rem',
                    border: '1px solid var(--kitz-border)',
                    background: 'var(--kitz-bg)',
                  }}
                  title="Activar este agente"
                >
                  Activar
                </button>
              )}
            </div>
            <p className="kz-mute" style={{ margin: 0, fontSize: '0.7rem' }}>
              {a.slug} · {a.model} · {a.tools.length} herr.
            </p>
            {a.description && (
              <p
                className="kz-mute"
                style={{
                  margin: 0,
                  fontSize: '0.7rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {a.description}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
