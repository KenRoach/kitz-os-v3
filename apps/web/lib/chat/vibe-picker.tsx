/**
 * VibePicker — chip-style picker for the chat personality.
 *
 * Two surfaces:
 *   - Inline (compact, single-row scrollable) — for the chat panel
 *   - Popover (button + dropdown) — for the mobile header
 */

'use client';

import { useEffect, useState } from 'react';
import { VIBES, getVibe, loadVibe, saveVibe, type VibeId } from './vibes';

type Props = {
  tenantSlug: string;
  variant?: 'inline' | 'popover';
  onChange?: (id: VibeId) => void;
};

export function VibePicker({ tenantSlug, variant = 'inline', onChange }: Props) {
  const [active, setActive] = useState<VibeId>('profesional');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setActive(loadVibe(tenantSlug));
  }, [tenantSlug]);

  function pick(id: VibeId) {
    setActive(id);
    saveVibe(tenantSlug, id);
    setOpen(false);
    onChange?.(id);
  }

  if (variant === 'popover') {
    const v = getVibe(active);
    return (
      <div style={{ position: 'relative', display: 'inline-flex' }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Personalidad: ${v.label}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.2rem 0.5rem',
            border: '1px solid var(--kitz-line-strong)',
            background: 'var(--kitz-bg)',
            color: 'var(--kitz-ink)',
            fontSize: '0.65rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--kitz-font-mono)',
          }}
        >
          <span>{v.glyph}</span>
          {v.label}
        </button>
        {open && (
          <ul
            role="listbox"
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              right: 0,
              zIndex: 30,
              listStyle: 'none',
              padding: 0,
              margin: 0,
              minWidth: '14rem',
              background: 'var(--kitz-surface)',
              border: '1px solid var(--kitz-line-strong)',
              boxShadow: '0 8px 20px rgba(26,26,26,0.08)',
            }}
          >
            {VIBES.map((vibe) => {
              const isActive = vibe.id === active;
              return (
                <li key={vibe.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => pick(vibe.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem 0.75rem',
                      border: 'none',
                      background: isActive ? 'var(--kitz-sunk)' : 'transparent',
                      color: 'var(--kitz-ink)',
                      fontFamily: 'var(--kitz-font-mono)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem',
                      borderBottom: '1px solid var(--kitz-line)',
                    }}
                  >
                    <span style={{ color: 'var(--kitz-accent-gold)', fontSize: '0.9rem' }}>
                      {vibe.glyph}
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontWeight: 600 }}>{vibe.label}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--kitz-ink-3)' }}>
                        {vibe.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  // Inline: scrollable chip rail
  return (
    <div
      role="tablist"
      aria-label="Personalidad de Kitz"
      style={{
        display: 'flex',
        gap: 4,
        overflowX: 'auto',
        paddingBottom: 2,
        scrollbarWidth: 'none',
      }}
    >
      {VIBES.map((vibe) => {
        const isActive = vibe.id === active;
        return (
          <button
            key={vibe.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => pick(vibe.id)}
            title={vibe.description}
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '0.2rem 0.55rem',
              border: '1px solid var(--kitz-line-strong)',
              background: isActive ? 'var(--kitz-ink)' : 'var(--kitz-bg)',
              color: isActive ? 'var(--kitz-bg)' : 'var(--kitz-ink-2)',
              fontSize: '0.65rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--kitz-font-mono)',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{vibe.glyph}</span>
            {vibe.label}
          </button>
        );
      })}
    </div>
  );
}
