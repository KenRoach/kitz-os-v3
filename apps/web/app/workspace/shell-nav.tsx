'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { NAV_BY_MODE, SHELL_MODES, isActive, modeForPath, type ShellMode } from './nav-config';
import ShellNavFooter from './shell-nav-footer';
import { useFullscreen } from './fullscreen-context';

const MODE_ROOT: Record<ShellMode, string> = {
  workspace: '/workspace',
  brain: '/workspace/brain',
  canvas: '/workspace/canvas',
};

const COLLAPSE_KEY = 'kitz-nav-collapsed';

type Props = {
  tenantSlug: string;
  role: string;
  email: string;
};

export default function ShellNav({ tenantSlug, role, email }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const mode = useMemo(() => modeForPath(pathname), [pathname]);
  const sections = NAV_BY_MODE[mode];
  const [userCollapsed, setUserCollapsed] = useState(false);
  const { fullscreen } = useFullscreen();

  // Fullscreen forces collapsed regardless of user pref so the canvas
  // gets maximum width. User can still toggle their own preference; it
  // re-applies when fullscreen exits.
  const collapsed = fullscreen || userCollapsed;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(COLLAPSE_KEY) === '1') {
      setUserCollapsed(true);
    }
  }, []);

  function toggleCollapsed() {
    const next = !userCollapsed;
    setUserCollapsed(next);
    if (typeof window !== 'undefined') {
      if (next) {
        window.localStorage.setItem(COLLAPSE_KEY, '1');
      } else {
        window.localStorage.removeItem(COLLAPSE_KEY);
      }
    }
  }

  return (
    <aside
      style={{
        width: collapsed ? '3.25rem' : '18rem',
        height: '100%',
        borderRight: '1px solid var(--kitz-border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        background: 'var(--kitz-bg)',
        overflowY: 'auto',
        transition: 'width 0.18s ease',
      }}
    >
      {!collapsed && (
        <div
          role="tablist"
          aria-label="Modo del espacio"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${SHELL_MODES.length}, 1fr)`,
            borderBottom: '1px solid var(--kitz-border)',
          }}
        >
          {SHELL_MODES.map((m, i) => {
            const active = m.id === mode;
            const isLast = i === SHELL_MODES.length - 1;
            return (
              <button
                key={m.id}
                role="tab"
                aria-selected={active}
                onClick={() => router.push(MODE_ROOT[m.id])}
                style={{
                  padding: '0.6rem 0.5rem',
                  background: active ? 'var(--kitz-text-strong)' : 'var(--kitz-bg)',
                  color: active ? 'var(--kitz-bg)' : 'var(--kitz-text)',
                  border: 'none',
                  borderRight: isLast ? 'none' : '1px solid var(--kitz-border)',
                  cursor: 'pointer',
                  fontFamily: 'var(--kitz-font-mono)',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      )}

      <nav
        style={{
          flex: 1,
          padding: collapsed ? '0.5rem 0.25rem' : '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {sections.map((section, i) => (
          <div key={i} style={{ marginBottom: '0.5rem' }}>
            {!collapsed && section.heading && (
              <p
                className="kz-label"
                style={{ padding: '0.5rem 0.75rem 0.25rem', margin: 0, fontSize: '0.65rem' }}
              >
                {section.heading}
              </p>
            )}
            {section.items.map((item) => {
              const active = isActive(pathname, item.href);
              if (collapsed) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '2.5rem',
                      height: '2.5rem',
                      margin: '0 auto',
                      textDecoration: 'none',
                      fontSize: '0.75rem',
                      color: active ? 'var(--kitz-text-strong)' : 'var(--kitz-text-dim)',
                      border: active ? '1px solid var(--kitz-border)' : '1px solid transparent',
                      background: active ? 'var(--kitz-muted)' : 'transparent',
                      fontFamily: 'var(--kitz-font-mono)',
                    }}
                  >
                    {item.label.slice(0, 2).toUpperCase()}
                  </Link>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'block',
                    padding: '0.5rem 0.75rem',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
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

      <ShellNavFooter
        tenantSlug={tenantSlug}
        role={role}
        email={email}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />
    </aside>
  );
}
