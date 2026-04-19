'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  NAV_BY_MODE,
  isActive,
  modeForPath,
  type NavSection,
} from './nav-config';
import NavIcon from './nav-icons';
import ShellChat from './shell-chat';
import ShellNavFooter from './shell-nav-footer';
import { useFullscreen } from './fullscreen-context';

const PROJECT_OPEN_KEY = 'kitz-project-open';

type Props = {
  tenantSlug: string;
  role: string;
  email: string;
};

/**
 * Left rail composed of three regions stacked top-to-bottom:
 *   1. Project menu  — collapsible nav items for the active mode
 *   2. ShellChat     — the existing Kitz chat panel (side='left')
 *   3. ShellNavFooter — language pills + theme + fullscreen + collapse + settings
 *
 * The whole rail lives in the workspace layout and replaces both the old
 * left-icon nav and the right-side chat. Mode switching now lives in TopNav.
 */
export default function ChatRail({ tenantSlug, role, email }: Props) {
  const pathname = usePathname();
  const mode = modeForPath(pathname);
  const sections: NavSection[] = NAV_BY_MODE[mode];
  const [projectOpen, setProjectOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const { fullscreen } = useFullscreen();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const v = window.localStorage.getItem(PROJECT_OPEN_KEY);
    if (v === '0') setProjectOpen(false);
    if (window.localStorage.getItem('kitz-nav-collapsed') === '1') setCollapsed(true);
  }, []);

  function toggleProject() {
    const next = !projectOpen;
    setProjectOpen(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PROJECT_OPEN_KEY, next ? '1' : '0');
    }
  }

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    if (typeof window !== 'undefined') {
      if (next) window.localStorage.setItem('kitz-nav-collapsed', '1');
      else window.localStorage.removeItem('kitz-nav-collapsed');
    }
  }

  // Fullscreen forces the rail closed entirely; ShellChat already handles
  // its own collapsed-edge tab, so we just render nothing here and let it
  // float its CHAT ⌘/ tab against the left edge.
  if (fullscreen) {
    return <ShellChat side="left" />;
  }

  if (collapsed) {
    return (
      <aside
        style={{
          width: '3.25rem',
          height: '100%',
          borderRight: '1px solid var(--kitz-border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          background: 'var(--kitz-bg)',
        }}
      >
        <nav
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            padding: '0.5rem 0.25rem',
            overflowY: 'auto',
          }}
        >
          {sections.flatMap((s) =>
            s.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  aria-label={item.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '2.5rem',
                    height: '2.5rem',
                    margin: '0 auto',
                    textDecoration: 'none',
                    color: active ? 'var(--kitz-text-strong)' : 'var(--kitz-text-dim)',
                    border: active ? '1px solid var(--kitz-border)' : '1px solid transparent',
                    background: active ? 'var(--kitz-muted)' : 'transparent',
                  }}
                >
                  <NavIcon icon={item.icon} size={16} />
                </Link>
              );
            }),
          )}
        </nav>
        <ShellNavFooter
          tenantSlug={tenantSlug}
          role={role}
          email={email}
          collapsed
          onToggleCollapsed={toggleCollapsed}
        />
      </aside>
    );
  }

  return (
    <aside
      style={{
        width: 'clamp(20rem, 24vw, 26rem)',
        height: '100%',
        borderRight: '1px solid var(--kitz-border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        background: 'var(--kitz-bg)',
        minHeight: 0,
      }}
    >
      {/* Project menu */}
      <div
        style={{
          borderBottom: '1px solid var(--kitz-border)',
          flexShrink: 0,
          maxHeight: projectOpen ? '40%' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <button
          type="button"
          onClick={toggleProject}
          aria-expanded={projectOpen}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '0.55rem 0.85rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--kitz-text-strong)',
            cursor: 'pointer',
            fontFamily: 'var(--kitz-font-mono)',
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          <span>Project</span>
          <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>{projectOpen ? '▾' : '▸'}</span>
        </button>
        {projectOpen && (
          <nav
            style={{
              padding: '0.25rem 0 0.5rem',
              overflowY: 'auto',
              minHeight: 0,
            }}
          >
            {sections.map((section, i) => (
              <div key={i} style={{ marginBottom: '0.25rem' }}>
                {section.heading && (
                  <p
                    className="kz-label"
                    style={{
                      padding: '0.4rem 0.85rem 0.2rem',
                      margin: 0,
                      fontSize: '0.6rem',
                      color: 'var(--kitz-text-dim)',
                    }}
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
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.55rem',
                        padding: '0.4rem 0.85rem',
                        textDecoration: 'none',
                        fontSize: '0.8rem',
                        color: active ? 'var(--kitz-text-strong)' : 'var(--kitz-text)',
                        borderLeft: active
                          ? '2px solid var(--kitz-accent)'
                          : '2px solid transparent',
                        background: active ? 'var(--kitz-muted)' : 'transparent',
                      }}
                    >
                      <NavIcon icon={item.icon} size={14} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        )}
      </div>

      {/* Chat panel — fills remaining height */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <ShellChat side="left" />
      </div>

      {/* Footer toolbar — language / theme / fullscreen / collapse / settings */}
      <ShellNavFooter
        tenantSlug={tenantSlug}
        role={role}
        email={email}
        collapsed={false}
        onToggleCollapsed={toggleCollapsed}
      />
    </aside>
  );
}
