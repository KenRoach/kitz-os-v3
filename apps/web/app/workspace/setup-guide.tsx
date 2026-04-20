'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, X, ChevronRight, ListChecks } from 'lucide-react';
import { PushToggle } from '@/lib/push/push-toggle';

type MilestoneId =
  | 'add_contact'
  | 'activate_agent'
  | 'connect_whatsapp'
  | 'create_quote'
  | 'topup_battery';

type Milestone = {
  id: MilestoneId;
  done: boolean;
};

type Snapshot = {
  milestones: Milestone[];
  doneCount: number;
  total: number;
};

type Response = { success: boolean; data: Snapshot | null; error: string | null };

const COPY: Record<MilestoneId, { title: string; cta: string; href: string }> = {
  add_contact: {
    title: 'Agrega tu primer contacto',
    cta: 'Ir a Clientes',
    href: '/workspace/contactos',
  },
  activate_agent: {
    title: 'Activa tu primer agente',
    cta: 'Configurar agente',
    href: '/workspace/brain/agentes',
  },
  connect_whatsapp: {
    title: 'Conecta WhatsApp',
    cta: 'Conectar',
    href: '/workspace/conversaciones',
  },
  create_quote: {
    title: 'Crea tu primera cotización',
    cta: 'Nueva cotización',
    href: '/workspace/cotizaciones',
  },
  topup_battery: {
    title: 'Recarga tu batería',
    cta: 'Ver planes',
    href: '/workspace/ajustes/facturacion',
  },
};

const DISMISS_KEY = 'kitz-setup-dismissed';

/**
 * Floating bottom-right setup checklist, Stripe-style. Shows the 5 KitZ
 * onboarding milestones with completion derived server-side from real
 * tenant data (contact count, active agent, WhatsApp connected, etc).
 *
 * - Auto-hides when all 5 are done.
 * - Dismissible per-tenant via localStorage; users can reopen with the
 *   small floating "Setup" pill that re-appears in the same corner.
 * - Polls /api/setup-progress on mount + when window regains focus so
 *   the checklist updates after the user completes a step in another tab.
 */
export default function SetupGuide({ tenantSlug }: { tenantSlug: string }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(true);

  const storageKey = `${DISMISS_KEY}:${tenantSlug}`;

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/setup-progress', { cache: 'no-store' });
      const j: Response = await r.json();
      if (j.data) setSnap(j.data);
    } catch {
      /* keep stale snap */
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDismissed(window.localStorage.getItem(storageKey) === '1');
  }, [storageKey]);

  useEffect(() => {
    void load();
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  const dismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, '1');
  };
  const undismiss = () => {
    setDismissed(false);
    if (typeof window !== 'undefined') window.localStorage.removeItem(storageKey);
  };

  if (!snap) return null;
  if (snap.doneCount === snap.total) return null; // hide when fully complete

  // Dismissed → show only the tiny re-open pill so it never gets lost.
  if (dismissed) {
    return (
      <>
        <style>{`
          @keyframes kitz-setup-breathe {
            0%, 100% {
              box-shadow:
                0 0 0 0 rgba(0, 0, 0, 0.25),
                0 2px 6px rgba(0, 0, 0, 0.12);
            }
            50% {
              box-shadow:
                0 0 0 10px rgba(0, 0, 0, 0),
                0 6px 18px rgba(0, 0, 0, 0.22);
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .kitz-setup-pill { animation: none !important; }
          }
        `}</style>
        <button
          type="button"
          onClick={undismiss}
          title="Mostrar guía de configuración"
          className="kitz-setup-pill"
          style={{
            position: 'fixed',
            left: '50%',
            bottom: '1rem',
            transform: 'translateX(-50%)',
            zIndex: 30,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.4rem 0.7rem',
            background: 'var(--kitz-ink)',
            color: 'var(--kitz-bg)',
            border: '1px solid var(--kitz-line-strong)',
            fontFamily: 'var(--kitz-font-mono)',
            fontSize: '0.7rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontWeight: 600,
            animation: 'kitz-setup-breathe 2.6s ease-in-out infinite',
          }}
        >
          <ListChecks size={13} strokeWidth={1.7} />
          Setup {snap.doneCount}/{snap.total}
        </button>
      </>
    );
  }

  const pct = Math.round((snap.doneCount / Math.max(snap.total, 1)) * 100);

  return (
    <aside
      role="region"
      aria-label="Guía de configuración"
      style={{
        position: 'fixed',
        right: '1rem',
        bottom: '1rem',
        width: '20rem',
        maxWidth: 'calc(100vw - 2rem)',
        background: 'var(--kitz-surface)',
        border: '1px solid var(--kitz-line-strong)',
        boxShadow: '0 10px 30px rgba(26, 26, 26, 0.08)',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--kitz-font-mono)',
      }}
    >
      <header
        style={{
          padding: '0.65rem 0.85rem',
          borderBottom: '1px solid var(--kitz-line)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? 'Colapsar guía' : 'Expandir guía'}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            margin: 0,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--kitz-ink)',
            fontFamily: 'inherit',
            flex: 1,
            textAlign: 'left',
          }}
        >
          <ListChecks size={14} strokeWidth={1.7} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.04em' }}>
            Configuración
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--kitz-ink-3)', marginLeft: 'auto' }}>
            {snap.doneCount}/{snap.total}
          </span>
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Ocultar guía"
          title="Ocultar"
          style={{
            background: 'transparent',
            border: 'none',
            padding: '0.15rem',
            cursor: 'pointer',
            color: 'var(--kitz-ink-3)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
        >
          <X size={14} strokeWidth={1.7} />
        </button>
      </header>

      {/* Progress bar */}
      <div
        aria-hidden
        style={{
          height: '2px',
          background: 'var(--kitz-line)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: `${pct}%`,
            background: 'var(--kitz-accent-gold)',
            transition: 'width 240ms ease',
          }}
        />
      </div>

      {open && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {snap.milestones.map((m, i) => {
            const copy = COPY[m.id];
            return (
              <li
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.6rem 0.85rem',
                  borderBottom: i < snap.milestones.length - 1 ? '1px solid var(--kitz-line)' : 'none',
                  fontSize: '0.75rem',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: '1.05rem',
                    height: '1.05rem',
                    border: `1px solid ${m.done ? 'var(--kitz-moss)' : 'var(--kitz-ink-3)'}`,
                    background: m.done ? 'var(--kitz-moss)' : 'transparent',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {m.done && <Check size={11} color="var(--kitz-bg)" strokeWidth={3} />}
                </span>
                <span
                  style={{
                    flex: 1,
                    color: m.done ? 'var(--kitz-ink-3)' : 'var(--kitz-ink)',
                    textDecoration: m.done ? 'line-through' : 'none',
                  }}
                >
                  {copy.title}
                </span>
                {!m.done && (
                  <Link
                    href={copy.href}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.65rem',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: 'var(--kitz-ink)',
                      background: 'var(--kitz-bg)',
                      border: '1px solid var(--kitz-line-strong)',
                      padding: '0.25rem 0.5rem',
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    {copy.cta}
                    <ChevronRight size={11} strokeWidth={1.7} />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {/* Cross-device push alerts — hidden unless the browser supports
          it and the user hasn't already denied. Safe to render on
          every session; PushToggle self-hides otherwise. */}
      <div
        style={{
          borderTop: '1px solid var(--kitz-line)',
          padding: '0.75rem 0.9rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <span
          style={{
            fontSize: '0.7rem',
            color: 'var(--kitz-ink-2)',
            lineHeight: 1.35,
          }}
        >
          Recibe alertas de WhatsApp y facturas aunque KitZ esté cerrado.
        </span>
        <PushToggle device="desktop" size="sm" />
      </div>
    </aside>
  );
}
