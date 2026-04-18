'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { NAV_BY_MODE, SHELL_MODES, isActive, modeForPath, type ShellMode } from './nav-config';

const MODE_ROOT: Record<ShellMode, string> = {
  workspace: '/workspace',
  brain: '/workspace/brain',
  canvas: '/workspace/canvas',
};

export default function ShellNav({
  tenantName,
  tenantSlug,
  role,
  email,
}: {
  tenantName: string;
  tenantSlug: string;
  role: string;
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const mode = useMemo(() => modeForPath(pathname), [pathname]);
  const sections = NAV_BY_MODE[mode];

  async function signOut() {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  }

  return (
    <aside
      style={{
        width: '14rem',
        height: '100vh',
        borderRight: '1px solid var(--kitz-border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        background: 'var(--kitz-bg)',
        overflowY: 'auto',
      }}
    >
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--kitz-border)' }}>
        <p className="kz-mute kz-prompt" style={{ margin: 0 }}>
          kitz
        </p>
        <p style={{ margin: '0.25rem 0 0 0', color: 'var(--kitz-text-strong)' }}>{tenantName}</p>
        <p className="kz-mute" style={{ margin: '0.125rem 0 0 0', fontSize: '0.7rem' }}>
          {tenantSlug}
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Modo del espacio"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${SHELL_MODES.length}, 1fr)`,
          borderBottom: '1px solid var(--kitz-border)',
        }}
      >
        {SHELL_MODES.map((m) => {
          const active = m.id === mode;
          return (
            <button
              key={m.id}
              role="tab"
              aria-selected={active}
              onClick={() => router.push(MODE_ROOT[m.id])}
              style={{
                padding: '0.5rem 0.25rem',
                background: active ? 'var(--kitz-text-strong)' : 'var(--kitz-bg)',
                color: active ? 'var(--kitz-bg)' : 'var(--kitz-text)',
                border: 'none',
                borderRight:
                  m.id === SHELL_MODES[SHELL_MODES.length - 1]?.id
                    ? 'none'
                    : '1px solid var(--kitz-border)',
                cursor: 'pointer',
                fontFamily: 'var(--kitz-font-mono)',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <nav
        style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        {sections.map((section, i) => (
          <div key={i} style={{ marginBottom: '0.5rem' }}>
            {section.heading && (
              <p
                className="kz-label"
                style={{ padding: '0.5rem 0.75rem 0.25rem', margin: 0, fontSize: '0.65rem' }}
              >
                {section.heading}
              </p>
            )}
            {section.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'block',
                    padding: '0.5rem 0.75rem',
                    textDecoration: 'none',
                    fontSize: '0.8125rem',
                    color: active ? 'var(--kitz-text-strong)' : 'var(--kitz-text)',
                    borderLeft: active ? '2px solid var(--kitz-accent)' : '2px solid transparent',
                    background: active ? 'var(--kitz-muted)' : 'transparent',
                  }}
                >
                  {active ? <span className="kz-prompt">{item.label}</span> : item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: '0.75rem', borderTop: '1px solid var(--kitz-border)' }}>
        <p className="kz-mute" style={{ margin: 0, fontSize: '0.7rem' }}>
          {role}
        </p>
        <p
          style={{
            margin: '0.125rem 0 0.5rem 0',
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
        <button
          type="button"
          onClick={signOut}
          className="kz-button kz-button-ghost"
          style={{ fontSize: '0.6875rem', padding: '0.4rem 0.5rem' }}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
