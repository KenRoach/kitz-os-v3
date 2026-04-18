'use client';

import { useEffect } from 'react';
import { useFullscreen } from './fullscreen-context';

export default function TopNavFullscreen() {
  const { fullscreen, toggle } = useFullscreen();

  // Keyboard shortcut: Cmd/Ctrl + . toggles fullscreen
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  const iconProps = {
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={fullscreen}
      aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
      title={
        fullscreen ? 'Salir de pantalla completa (⌘.)' : 'Pantalla completa: oculta nav y chat (⌘.)'
      }
      style={{
        background: fullscreen ? 'var(--kitz-text-strong)' : 'transparent',
        color: fullscreen ? 'var(--kitz-bg)' : 'var(--kitz-text)',
        border: 'none',
        borderLeft: '1px solid var(--kitz-border)',
        cursor: 'pointer',
        padding: '0 0.85rem',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem',
        fontFamily: 'var(--kitz-font-mono)',
        fontSize: '0.65rem',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}
    >
      {fullscreen ? (
        <svg {...iconProps}>
          {/* contract / collapse-inward */}
          <polyline points="9 4 9 9 4 9" />
          <polyline points="15 4 15 9 20 9" />
          <polyline points="9 20 9 15 4 15" />
          <polyline points="15 20 15 15 20 15" />
        </svg>
      ) : (
        <svg {...iconProps}>
          {/* expand / outward arrows */}
          <polyline points="4 9 4 4 9 4" />
          <polyline points="20 9 20 4 15 4" />
          <polyline points="4 15 4 20 9 20" />
          <polyline points="20 15 20 20 15 20" />
        </svg>
      )}
      <span>{fullscreen ? 'Salir' : 'Full'}</span>
    </button>
  );
}
