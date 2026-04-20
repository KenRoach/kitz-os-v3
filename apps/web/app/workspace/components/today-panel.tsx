/**
 * TodayPanel — what the user actually has on their plate today.
 *
 * Three rolled-up signals from real data:
 *   - Calendar events scheduled today (from db.calendar.list with from/to)
 *   - Invoices due today (from db.invoices.list, filtered client-side
 *     because the store doesn't expose a due_at filter)
 *   - WhatsApp inbox state (from db.whatsapp.countConnected — proxy for
 *     "do you have a connected number that needs attention")
 *
 * Renders a compact list. Empty state is intentional: tells the user
 * "día libre" rather than hiding the section.
 */

import Link from 'next/link';
import type { CalendarEvent, Invoice, DbClient } from '@kitz/db';

type Props = {
  tenantId: string;
  db: DbClient;
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default async function TodayPanel({ tenantId, db }: Props) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const endIso = end.toISOString();
  const startIso = start.toISOString();

  const [events, invoicesAll, whatsappConnected] = await Promise.all([
    db.calendar.list(tenantId, { from: startIso, to: endIso }),
    db.invoices.list(tenantId),
    db.whatsapp.countConnected(tenantId),
  ]);

  // Invoices due today (or overdue but not paid)
  const dueToday = invoicesAll.filter((i) => {
    if (!i.due_at) return false;
    if (i.status === 'paid' || i.status === 'cancelled') return false;
    return i.due_at >= startIso && i.due_at < endIso;
  });

  const eventsSorted = [...events].sort((a, b) => a.start_at.localeCompare(b.start_at));

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
        <h2 style={{ fontSize: '1rem', margin: 0 }}>Hoy</h2>
        <Link
          href="/workspace/calendario"
          style={{
            fontSize: '0.7rem',
            color: 'var(--kitz-ink-3)',
            textDecoration: 'none',
            letterSpacing: '0.05em',
          }}
        >
          Ver todo →
        </Link>
      </header>

      {/* Events */}
      <div>
        <div
          style={{
            fontSize: '0.65rem',
            color: 'var(--kitz-ink-3)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '0.4rem',
          }}
        >
          Agenda · {eventsSorted.length} evento{eventsSorted.length === 1 ? '' : 's'}
        </div>
        {eventsSorted.length === 0 ? (
          <div style={{ fontSize: '0.85rem', color: 'var(--kitz-ink-2)' }}>
            Día libre. Aprovecha.
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {eventsSorted.slice(0, 4).map((e: CalendarEvent) => (
              <li
                key={e.id}
                style={{
                  display: 'flex',
                  gap: '0.6rem',
                  padding: '0.35rem 0',
                  borderBottom: '1px solid var(--kitz-line)',
                  fontSize: '0.85rem',
                }}
              >
                <span
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--kitz-ink-2)',
                    minWidth: '3rem',
                  }}
                >
                  {fmtTime(e.start_at)}
                </span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Invoices due today */}
      {dueToday.length > 0 && (
        <div>
          <div
            style={{
              fontSize: '0.65rem',
              color: 'var(--kitz-accent-gold)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '0.4rem',
              fontWeight: 600,
            }}
          >
            Facturas vencen hoy · {dueToday.length}
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {dueToday.slice(0, 3).map((inv: Invoice) => (
              <li
                key={inv.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '0.6rem',
                  padding: '0.35rem 0',
                  borderBottom: '1px solid var(--kitz-line)',
                  fontSize: '0.85rem',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {inv.number} · {inv.customer_name}
                </span>
                <span
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--kitz-ink-2)',
                    flexShrink: 0,
                  }}
                >
                  {inv.currency} {inv.total.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* WhatsApp connection state */}
      {whatsappConnected === 0 && (
        <div
          style={{
            padding: '0.6rem 0.75rem',
            border: '1px dashed var(--kitz-ink-3)',
            fontSize: '0.75rem',
            color: 'var(--kitz-ink-2)',
            background: 'var(--kitz-surface)',
          }}
        >
          <div
            style={{
              fontSize: '0.6rem',
              color: 'var(--kitz-ink-3)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            WhatsApp
          </div>
          Sin números conectados.{' '}
          <Link
            href="/workspace/conversaciones"
            style={{ color: 'var(--kitz-ink)', textDecoration: 'underline' }}
          >
            Conectar →
          </Link>
        </div>
      )}
    </section>
  );
}
