'use client';

import { useEffect, useState } from 'react';
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

        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
            style={{
              background: 'transparent',
              border: '1px solid var(--kitz-border)',
              cursor: 'pointer',
              color: 'var(--kitz-text-dim)',
              fontFamily: 'var(--kitz-font-mono)',
              fontSize: '0.7rem',
              padding: '0.2rem 0.4rem',
            }}
          >
            {isDark ? '☀' : '☾'}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-pressed={fullscreen}
            aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            title={fullscreen ? 'Salir (⌘.)' : 'Pantalla completa (⌘.)'}
            style={{
              background: fullscreen ? 'var(--kitz-text-strong)' : 'transparent',
              color: fullscreen ? 'var(--kitz-bg)' : 'var(--kitz-text-dim)',
              border: '1px solid var(--kitz-border)',
              cursor: 'pointer',
              padding: '0.2rem 0.4rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '1.5rem',
            }}
          >
            <svg
              width={11}
              height={11}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
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
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Colapsar nav"
            title="Colapsar"
            style={{
              background: 'transparent',
              border: '1px solid var(--kitz-border)',
              cursor: 'pointer',
              color: 'var(--kitz-text-dim)',
              fontFamily: 'var(--kitz-font-mono)',
              fontSize: '0.7rem',
              padding: '0.2rem 0.4rem',
            }}
          >
            ‹
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
