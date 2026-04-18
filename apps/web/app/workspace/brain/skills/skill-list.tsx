'use client';

import type { Skill } from '@kitz/db';
import { SKILL_KIND_LABELS } from '@kitz/db/skill-kinds';

type Props = {
  items: Skill[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export default function SkillList({ items, selectedId, onSelect }: Props) {
  if (items.length === 0) {
    return (
      <div className="kz-panel" style={{ padding: '1rem' }}>
        <p className="kz-mute">Sin skills. Crea el primero arriba.</p>
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
      {items.map((s) => {
        const selected = s.id === selectedId;
        return (
          <li
            key={s.id}
            onClick={() => onSelect(s.id)}
            style={{
              borderBottom: '1px solid var(--kitz-border)',
              background: selected ? 'var(--kitz-muted)' : 'var(--kitz-bg)',
              borderLeft: selected ? '2px solid var(--kitz-accent)' : '2px solid transparent',
              padding: '0.65rem 0.75rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            <p
              style={{
                margin: 0,
                color: 'var(--kitz-text-strong)',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              {s.name}
            </p>
            <p className="kz-mute" style={{ margin: 0, fontSize: '0.7rem' }}>
              {s.slug} · {SKILL_KIND_LABELS[s.kind]}
            </p>
            {s.description && (
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
                {s.description}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
