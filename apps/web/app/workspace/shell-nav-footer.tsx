'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useFullscreen } from './fullscreen-context';

const LANGS = ['ES', 'EN', 'PT'] as const;
type Lang = (typeof LANGS)[number];

type Props = {
  tenantSlug: string;
  role: string;
  email: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

const LANG_KEY = 'kitz-lang';
const THEME_KEY = 'kitz-theme';

function isLang(value: string | null): value is Lang {
  return value === 'ES' || value === 'EN' || value === 'PT';
}

/** Icon button style matched to the chat attachment buttons. */
function iconBtnStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? 'var(--kitz-text-strong)' : 'transparent',
    color: active ? 'var(--kitz-bg)' : 'var(--kitz-text)',
    border: '1px solid var(--kitz-border)',
    cursor: 'pointer',
    padding: '0.3rem 0.45rem',
    fontFamily: 'var(--kitz-font-mono)',
    fontSize: '0.7rem',
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '1.75rem',
    height: '1.75rem',
  };
}

const iconSvgProps = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export default function ShellNavFooter({
  tenantSlug,
  role,
  email,
  collapsed,
  onToggleCollapsed,
}: Props) {
  const [lang, setLang] = useState<Lang>('ES');
  const [isDark, setIsDark] = useState(false);
  const { fullscreen, toggle: toggleFullscreen } = useFullscreen();

  // Cmd/Ctrl + . toggles fullscreen from anywhere
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        toggleFullscreen();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleFullscreen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(LANG_KEY);
    if (isLang(stored)) setLang(stored);
    const theme = window.localStorage.getItem(THEME_KEY);
    if (theme === 'dark') {
      setIsDark(true);
      document.documentElement.dataset['theme'] = 'dark';
    }
  }, []);

  function pickLang(next: Lang) {
    setLang(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANG_KEY, next);
    }
  }

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
      if (next) {
        document.documentElement.dataset['theme'] = 'dark';
      } else {
        delete document.documentElement.dataset['theme'];
      }
    }
  }

  async function signOut() {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  }

  if (collapsed) {
    return (
      <div
        style={{
          padding: '0.75rem 0.5rem',
          borderTop: '1px solid var(--kitz-border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.4rem',
        }}
      >
        {fullscreen && (
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="Salir de pantalla completa"
            title="Salir de pantalla completa (⌘.)"
            style={{
              background: 'var(--kitz-text-strong)',
              color: 'var(--kitz-bg)',
              border: '1px solid var(--kitz-border)',
              cursor: 'pointer',
              padding: '0.25rem 0.35rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '1.75rem',
              minHeight: '1.75rem',
            }}
          >
            <svg
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <polyline points="9 4 9 9 4 9" />
              <polyline points="15 4 15 9 20 9" />
              <polyline points="9 20 9 15 4 15" />
              <polyline points="15 20 15 15 20 15" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (fullscreen) toggleFullscreen();
            onToggleCollapsed();
          }}
          aria-label="Expandir nav"
          title="Expandir"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--kitz-text-dim)',
            fontFamily: 'var(--kitz-font-mono)',
            fontSize: '1rem',
            padding: '0.25rem 0.5rem',
          }}
        >
          ›
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '0.75rem', borderTop: '1px solid var(--kitz-border)' }}>
      <p className="kz-mute" style={{ margin: 0, fontSize: '0.7rem' }}>
        {role} · {tenantSlug}
      </p>
      <p
        style={{
          margin: '0.125rem 0 0.75rem 0',
          fontSize: '0.75rem',
          color: 'var(--kitz-text-strong)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={email}
      >
        {email}
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          marginBottom: '0.75rem',
        }}
      >
        <div role="group" aria-label="Idioma" style={{ display: 'flex', gap: 0 }}>
          {LANGS.map((l) => {
            const active = l === lang;
            return (
              <button
                key={l}
                type="button"
                onClick={() => pickLang(l)}
                aria-pressed={active}
                style={{
                  padding: '0.2rem 0.4rem',
                  border: '1px solid var(--kitz-border)',
                  background: active ? 'var(--kitz-text-strong)' : 'var(--kitz-bg)',
                  color: active ? 'var(--kitz-bg)' : 'var(--kitz-text-dim)',
                  fontFamily: 'var(--kitz-font-mono)',
                  fontSize: '0.6rem',
                  cursor: 'pointer',
                  marginLeft: '-1px',
                }}
              >
                {l}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '0.3rem' }}>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
            style={iconBtnStyle(false)}
          >
            <svg {...iconSvgProps} aria-hidden>
              {isDark ? (
                <>
                  <circle cx="12" cy="12" r="4" />
                  <line x1="12" y1="2" x2="12" y2="5" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="5" y2="12" />
                  <line x1="19" y1="12" x2="22" y2="12" />
                  <line x1="4.9" y1="4.9" x2="7" y2="7" />
                  <line x1="17" y1="17" x2="19.1" y2="19.1" />
                  <line x1="4.9" y1="19.1" x2="7" y2="17" />
                  <line x1="17" y1="7" x2="19.1" y2="4.9" />
                </>
              ) : (
                <path d="M20 14.5A8 8 0 019.5 4a8.5 8.5 0 1010.5 10.5z" />
              )}
            </svg>
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-pressed={fullscreen}
            aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            title={fullscreen ? 'Salir (⌘.)' : 'Pantalla completa (⌘.)'}
            style={iconBtnStyle(fullscreen)}
          >
            <svg {...iconSvgProps} aria-hidden>
              {fullscreen ? (
                <>
                  <polyline points="9 4 9 9 4 9" />
                  <polyline points="15 4 15 9 20 9" />
                  <polyline points="9 20 9 15 4 15" />
                  <polyline points="15 20 15 15 20 15" />
                </>
              ) : (
                <>
                  <polyline points="4 9 4 4 9 4" />
                  <polyline points="20 9 20 4 15 4" />
                  <polyline points="4 15 4 20 9 20" />
                  <polyline points="20 15 20 20 15 20" />
                </>
              )}
            </svg>
          </button>
          <Link
            href="/workspace/ajustes"
            aria-label="Ajustes"
            title="Ajustes"
            style={{ ...iconBtnStyle(false), textDecoration: 'none' }}
          >
            <svg {...iconSvgProps} aria-hidden>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 00.34 1.85l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.85-.34 1.7 1.7 0 00-1 1.55V21a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1-1.55 1.7 1.7 0 00-1.85.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.85 1.7 1.7 0 00-1.55-1H3a2 2 0 110-4h.09a1.7 1.7 0 001.55-1 1.7 1.7 0 00-.34-1.85l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.85.34h.01a1.7 1.7 0 001-1.55V3a2 2 0 114 0v.09a1.7 1.7 0 001 1.55 1.7 1.7 0 001.85-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.85v.01a1.7 1.7 0 001.55 1H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.55 1z" />
            </svg>
          </Link>
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Colapsar nav"
            title="Colapsar"
            style={iconBtnStyle(false)}
          >
            <svg {...iconSvgProps} aria-hidden>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={signOut}
        className="kz-button kz-button-ghost"
        style={{ fontSize: '0.6875rem', padding: '0.4rem 0.5rem' }}
      >
        Cerrar sesión
      </button>
    </div>
  );
}
