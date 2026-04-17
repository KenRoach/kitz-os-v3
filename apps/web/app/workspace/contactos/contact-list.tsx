'use client';

import type { Contact } from '@kitz/db';

type Props = {
  contacts: Contact[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (c: Contact) => void;
};

export default function ContactList({ contacts, loading, selectedId, onSelect }: Props) {
  if (loading) {
    return (
      <div className="kz-panel" style={{ padding: '1rem' }}>
        <p className="kz-mute">cargando…</p>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="kz-panel" style={{ padding: '1rem' }}>
        <p className="kz-mute">Sin contactos. Crea el primero arriba.</p>
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
        maxHeight: '32rem',
        overflowY: 'auto',
      }}
    >
      {contacts.map((c) => {
        const active = c.id === selectedId;
        return (
          <li
            key={c.id}
            onClick={() => onSelect(c)}
            style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid var(--kitz-border)',
              cursor: 'pointer',
              background: active ? 'var(--kitz-muted)' : 'var(--kitz-bg)',
              borderLeft: active ? '2px solid var(--kitz-accent)' : '2px solid transparent',
            }}
          >
            <p
              style={{
                margin: 0,
                color: 'var(--kitz-text-strong)',
                fontSize: '0.875rem',
              }}
            >
              {c.name}
            </p>
            <p className="kz-mute" style={{ margin: 0, fontSize: '0.75rem' }}>
              {c.company ?? c.email ?? c.phone ?? '—'}
            </p>
            {c.tags.length > 0 && (
              <div
                style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem', flexWrap: 'wrap' }}
              >
                {c.tags.map((t) => (
                  <span key={t} className="kz-kbd" style={{ fontSize: '0.65rem' }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
