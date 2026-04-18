'use client';

import { useEffect, useState } from 'react';

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
          gap: '0.5rem',
        }}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
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
