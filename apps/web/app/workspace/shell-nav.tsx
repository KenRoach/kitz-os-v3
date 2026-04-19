'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Wallet,
  ArrowRightLeft,
  Users,
  Package,
  Plug,
  Repeat,
  CreditCard,
  Receipt,
  BarChart3,
  MoreHorizontal,
  ChevronDown,
} from 'lucide-react';
import ShellNavFooter from './shell-nav-footer';
import { useFullscreen } from './fullscreen-context';
import { modeForPath } from './nav-config';

const SHELL_MODE_LABELS: Record<'workspace' | 'brain' | 'canvas', string> = {
  workspace: 'Workspace',
  brain: 'Brain',
  canvas: 'Canvas',
};

const COLLAPSE_KEY = 'kitz-nav-collapsed';

type Mode = 'sandbox' | 'live';

type Props = {
  tenantSlug: string;
  role: string;
  email: string;
  mode: Mode;
  hasSandbox: boolean;
  hasLive: boolean;
};

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  badge?: number;
};

/**
 * Stripe-shape left rail in KitZ vocabulary.
 *
 *   ┌──────────────────────┐
 *   │ Workspace switcher   │  KitZ + sandbox tag + slug
 *   ├──────────────────────┤
 *   │ Pinned               │  Daily ops: Inicio · Clientes · Conversaciones · Calendario · Documentos
 *   │ Atajos               │  One-click: Conectar WhatsApp · Nueva cotización
 *   │ Add-ons              │  Optional modules: Ventas / Reportes / Brain  (collapsible)
 *   ├──────────────────────┤
 *   │ Footer               │  ES/EN/PT · theme · fullscreen · settings · collapse
 *   └──────────────────────┘
 *
 * Billing/Plan/Battery intentionally NOT in the rail — those live under
 * Ajustes (Settings → Facturación), the same pattern as Stripe keeping
 * billing out of the operational nav.
 */
export default function ShellNav({ tenantSlug, role, email }: Props) {
  const pathname = usePathname();
  const shellMode = modeForPath(pathname);
  const [collapsed, setCollapsed] = useState(false);
  const [productsOpen, setProductsOpen] = useState({
    payments: true,
    reporting: false,
    more: false,
  });
  const { fullscreen } = useFullscreen();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(COLLAPSE_KEY) === '1') setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    if (typeof window !== 'undefined') {
      if (next) window.localStorage.setItem(COLLAPSE_KEY, '1');
      else window.localStorage.removeItem(COLLAPSE_KEY);
    }
  }

  function toggleGroup(key: keyof typeof productsOpen) {
    setProductsOpen((s) => ({ ...s, [key]: !s[key] }));
  }

  if (fullscreen) return null;

  // Operational entries — daily flow. Billing intentionally excluded:
  // it lives under Ajustes (Settings), not on the rail, the same way Stripe
  // keeps account/billing tucked into a settings surface rather than the
  // top-level nav.
  const pinned: NavItem[] = [
    { href: '/workspace', label: 'Inicio', icon: Home },
    { href: '/workspace/contactos', label: 'Clientes', icon: Users },
    { href: '/workspace/conversaciones', label: 'Conversaciones', icon: ArrowRightLeft },
    { href: '/workspace/calendario', label: 'Calendario', icon: Home },
    { href: '/workspace/canvas/documentos', label: 'Documentos', icon: Package },
  ];

  const shortcuts: NavItem[] = [
    { href: '/workspace/conversaciones', label: 'Conectar WhatsApp', icon: Plug },
    { href: '/workspace/cotizaciones', label: 'Nueva cotización', icon: Receipt },
  ];

  // Add-ons = optional modules the user can expand into. Each group has a
  // single coherent purpose; landing on the group root is always valid.
  const addOnGroups: {
    key: keyof typeof productsOpen;
    label: string;
    icon: typeof Home;
    items: NavItem[];
  }[] = [
    {
      key: 'payments',
      label: 'Ventas',
      icon: CreditCard,
      items: [
        { href: '/workspace/cotizaciones', label: 'Cotizaciones' },
        { href: '/workspace/ventas', label: 'Pipeline' },
      ].map((i) => ({ ...i, icon: Receipt })),
    },
    {
      key: 'reporting',
      label: 'Reportes',
      icon: BarChart3,
      items: [{ href: '/workspace/reportes', label: 'Resumen', icon: BarChart3 }],
    },
    {
      key: 'more',
      label: 'Brain',
      icon: MoreHorizontal,
      items: [
        { href: '/workspace/brain', label: 'Resumen' },
        { href: '/workspace/brain/agentes', label: 'Agentes' },
        { href: '/workspace/brain/skills', label: 'Skills' },
      ].map((i) => ({ ...i, icon: Home })),
    },
  ];

  const isActive = (href: string) =>
    href === pathname || (href !== '/workspace' && pathname.startsWith(`${href}/`));

  if (collapsed) {
    return (
      <aside
        style={{
          width: '3.25rem',
          height: '100%',
          borderRight: '1px solid var(--kitz-line-strong)',
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
            padding: '0.75rem 0.25rem',
            overflowY: 'auto',
          }}
        >
          {[...pinned, ...shortcuts].map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href + item.label}
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
                  color: active ? 'var(--kitz-ink)' : 'var(--kitz-ink-3)',
                  border: active ? '1px solid var(--kitz-line-strong)' : '1px solid transparent',
                  background: active ? 'var(--kitz-sunk)' : 'transparent',
                }}
              >
                <Icon size={16} strokeWidth={1.5} />
              </Link>
            );
          })}
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
        width: '17rem',
        height: '100%',
        borderRight: '1px solid var(--kitz-line-strong)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        background: 'var(--kitz-bg)',
        minHeight: 0,
      }}
    >
      {/* Workspace switcher — height matches TopNav (2.75rem) so the seam
          between row 1 and row 2 forms a single continuous line. */}
      <header
        style={{
          height: '2.75rem',
          padding: '0 0.85rem',
          borderBottom: '1px solid var(--kitz-line-strong)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            minWidth: 0,
            flex: 1,
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--kitz-ink)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={tenantSlug}
        >
          {SHELL_MODE_LABELS[shellMode]}
        </div>
        <ChevronDown size={14} strokeWidth={1.5} color="var(--kitz-ink-3)" />
      </header>

      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.75rem 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}
      >
        {/* Pinned */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {pinned.map((item) => (
            <RailLink key={item.href + item.label} item={item} active={isActive(item.href)} />
          ))}
        </div>

        {/* Shortcuts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <RailHeading>Atajos</RailHeading>
          {shortcuts.map((item) => (
            <RailLink key={item.href + item.label} item={item} active={isActive(item.href)} />
          ))}
        </div>

        {/* Add-ons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          <RailHeading>Add-ons</RailHeading>
          {addOnGroups.map((group) => {
            const Icon = group.icon;
            const open = productsOpen[group.key];
            return (
              <div key={group.key} style={{ display: 'flex', flexDirection: 'column' }}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  aria-expanded={open}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                    width: '100%',
                    padding: '0.4rem 0.85rem',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--kitz-ink-2)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'var(--kitz-font-mono)',
                    fontSize: '0.8rem',
                  }}
                >
                  <Icon size={14} strokeWidth={1.5} />
                  <span style={{ flex: 1 }}>{group.label}</span>
                  <ChevronDown
                    size={12}
                    strokeWidth={1.5}
                    style={{
                      transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
                      transition: 'transform 180ms cubic-bezier(0.4,0,0.2,1)',
                      color: 'var(--kitz-ink-3)',
                    }}
                  />
                </button>
                {open && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {group.items.map((sub) => (
                      <Link
                        key={sub.href + sub.label}
                        href={sub.href}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.35rem 0.85rem 0.35rem 2.1rem',
                          textDecoration: 'none',
                          fontSize: '0.75rem',
                          color: isActive(sub.href) ? 'var(--kitz-ink)' : 'var(--kitz-ink-2)',
                          background: isActive(sub.href) ? 'var(--kitz-sunk)' : 'transparent',
                          borderLeft: isActive(sub.href)
                            ? '2px solid var(--kitz-accent-gold)'
                            : '2px solid transparent',
                          transition: 'background 180ms cubic-bezier(0.4,0,0.2,1)',
                        }}
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

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

function RailHeading({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '0.15rem 0.85rem 0.25rem',
        fontSize: '0.6rem',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        color: 'var(--kitz-ink-3)',
        fontWeight: 500,
      }}
    >
      {children}
    </div>
  );
}

function RailLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.55rem',
        padding: '0.4rem 0.85rem',
        textDecoration: 'none',
        fontSize: '0.8rem',
        color: active ? 'var(--kitz-ink)' : 'var(--kitz-ink-2)',
        background: active ? 'var(--kitz-sunk)' : 'transparent',
        borderLeft: active ? '2px solid var(--kitz-accent-gold)' : '2px solid transparent',
        transition: 'background 180ms cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <Icon size={14} strokeWidth={1.5} />
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span
          aria-label={`${item.badge} pendientes`}
          style={{
            minWidth: '1.1rem',
            height: '1.1rem',
            padding: '0 0.3rem',
            background: 'var(--kitz-accent-gold)',
            color: 'var(--kitz-bg)',
            fontSize: '0.6rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}
