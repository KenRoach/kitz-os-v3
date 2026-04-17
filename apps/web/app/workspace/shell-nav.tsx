'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
  href: string;
  label: string;
  shortcut?: string;
};

const ITEMS: NavItem[] = [
  { href: '/workspace', label: 'Dashboard' },
  { href: '/workspace/contactos', label: 'Contactos' },
  { href: '/workspace/ventas', label: 'Ventas' },
  { href: '/workspace/conversaciones', label: 'Conversaciones' },
  { href: '/workspace/agentes', label: 'Agentes' },
  { href: '/workspace/ajustes', label: 'Ajustes' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/workspace') return pathname === '/workspace';
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
        borderRight: '1px solid var(--kitz-border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        background: 'var(--kitz-bg)',
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

      <nav
        style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        {ITEMS.map((item) => {
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
