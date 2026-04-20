/**
 * SetupCard — server-rendered version of the floating SetupGuide,
 * inlined on the dashboard so the user has a calm overview of what's
 * still left to set up without depending on the floating widget.
 *
 * The floating widget (workspace/setup-guide.tsx) is the persistent
 * cross-page reminder; this is the dashboard-native panel. Both read
 * the same milestone definitions so they stay in sync.
 */

import Link from 'next/link';
import type { DbClient } from '@kitz/db';

type Props = {
  tenantId: string;
  db: DbClient;
};

const FREE_GRANT = 100;

type MilestoneId =
  | 'add_contact'
  | 'activate_agent'
  | 'connect_whatsapp'
  | 'create_quote'
  | 'topup_battery';

type Milestone = {
  id: MilestoneId;
  title: string;
  href: string;
  cta: string;
  done: boolean;
};

export default async function SetupCard({ tenantId, db }: Props) {
  const [contactCount, activeAgent, whatsappConnected, invoiceCount, battery] = await Promise.all([
    db.contacts.count(tenantId),
    db.agents.getActive(tenantId),
    db.whatsapp.countConnected(tenantId),
    db.invoices.count(tenantId),
    db.billing.getBattery(tenantId),
  ]);

  const milestones: Milestone[] = [
    {
      id: 'add_contact',
      title: 'Agrega tu primer contacto',
      href: '/workspace/contactos',
      cta: 'Ir a Clientes',
      done: contactCount > 0,
    },
    {
      id: 'activate_agent',
      title: 'Activa tu primer agente',
      href: '/workspace/brain/agentes',
      cta: 'Configurar agente',
      done: !!activeAgent,
    },
    {
      id: 'connect_whatsapp',
      title: 'Conecta WhatsApp',
      href: '/workspace/conversaciones',
      cta: 'Conectar',
      done: whatsappConnected > 0,
    },
    {
      id: 'create_quote',
      title: 'Crea tu primera cotización',
      href: '/workspace/cotizaciones',
      cta: 'Nueva cotización',
      done: invoiceCount > 0,
    },
    {
      id: 'topup_battery',
      title: 'Recarga tu batería',
      href: '/workspace/ajustes/facturacion',
      cta: 'Ver planes',
      done: battery.lifetime_topup > FREE_GRANT,
    },
  ];

  const doneCount = milestones.filter((m) => m.done).length;
  const total = milestones.length;
  const allDone = doneCount === total;
  const pct = Math.round((doneCount / total) * 100);

  return (
    <section
      className="kz-panel"
      style={{
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        minHeight: '100%',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}
      >
        <h2 style={{ fontSize: '1rem', margin: 0 }}>Configuración</h2>
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--kitz-ink-3)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {doneCount}/{total}
        </span>
      </header>

      {/* Progress bar */}
      <div
        aria-hidden
        style={{
          height: 2,
          background: 'var(--kitz-line)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: `${pct}%`,
            background: allDone ? 'var(--kitz-moss)' : 'var(--kitz-accent-gold)',
            transition: 'width 240ms ease',
          }}
        />
      </div>

      {allDone ? (
        <p
          style={{
            margin: 0,
            fontSize: '0.85rem',
            color: 'var(--kitz-moss)',
            fontWeight: 500,
          }}
        >
          ✓ Todo listo. KitZ está completamente configurado.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {milestones.map((m) => (
            <li
              key={m.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.4rem 0',
                borderBottom: '1px solid var(--kitz-line)',
                fontSize: '0.85rem',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: '0.95rem',
                  height: '0.95rem',
                  border: `1px solid ${m.done ? 'var(--kitz-moss)' : 'var(--kitz-ink-3)'}`,
                  background: m.done ? 'var(--kitz-moss)' : 'transparent',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '0.6rem',
                  color: 'var(--kitz-bg)',
                  fontWeight: 700,
                }}
              >
                {m.done && '✓'}
              </span>
              <span
                style={{
                  flex: 1,
                  color: m.done ? 'var(--kitz-ink-3)' : 'var(--kitz-ink)',
                  textDecoration: m.done ? 'line-through' : 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {m.title}
              </span>
              {!m.done && (
                <Link
                  href={m.href}
                  style={{
                    fontSize: '0.65rem',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: 'var(--kitz-ink)',
                    background: 'var(--kitz-bg)',
                    border: '1px solid var(--kitz-line-strong)',
                    padding: '0.2rem 0.5rem',
                    textDecoration: 'none',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {m.cta}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
