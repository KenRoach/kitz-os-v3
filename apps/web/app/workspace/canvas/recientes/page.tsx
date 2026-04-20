import Link from 'next/link';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME, resolveSession } from '@/lib/auth/session';
import { INVOICE_KIND_LABELS } from '@kitz/db/invoice-constants';
import { DOCUMENT_KIND_LABELS } from '@kitz/db/document-kinds';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Recientes · KitZ' };

type Item = {
  id: string;
  kind: 'invoice' | 'document';
  label: string;
  detail: string;
  href: string;
  updatedAt: string;
};

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 60) return `hace ${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr}h`;
  return `hace ${Math.floor(hr / 24)}d`;
}

/**
 * Recientes — chronological merge of artifact streams (invoices +
 * documents) sorted by updated_at desc, capped at the last 30. The
 * stream gives the user a "what changed lately" answer without
 * needing to open each surface.
 */
export default async function RecientesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const db = getDb();
  const session = await resolveSession(db, token);
  const primary = session ? await db.findPrimaryTenant(session.user_id) : null;
  if (!session || !primary) return null;

  const [invoices, documents] = await Promise.all([
    db.invoices.list(primary.tenant.id),
    db.documents.list(primary.tenant.id),
  ]);

  const items: Item[] = [
    ...invoices.map(
      (inv): Item => ({
        id: `inv-${inv.id}`,
        kind: 'invoice',
        label: `${inv.number} · ${inv.customer_name}`,
        detail: `${INVOICE_KIND_LABELS[inv.kind]} · ${inv.currency} ${inv.total.toFixed(2)} · ${inv.status}`,
        href: '/workspace/cotizaciones',
        updatedAt: inv.updated_at,
      }),
    ),
    ...documents.map(
      (d): Item => ({
        id: `doc-${d.id}`,
        kind: 'document',
        label: d.filename,
        detail: `${DOCUMENT_KIND_LABELS[d.kind]} · ${d.status}`,
        href: '/workspace/canvas/documentos',
        updatedAt: d.updated_at,
      }),
    ),
  ]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 30);

  return (
    <section
      style={{
        padding: 'clamp(1rem, 2.5vw, 2rem)',
        maxWidth: '60rem',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      <header>
        <p className="kz-mute kz-prompt" style={{ marginBottom: '0.5rem' }}>
          kitz canvas recent
        </p>
        <h1 style={{ marginBottom: '0.25rem' }}>Recientes</h1>
        <p className="kz-mute" style={{ margin: 0 }}>
          Últimos {items.length} artefacto{items.length === 1 ? '' : 's'} editado
          {items.length === 1 ? '' : 's'}.
        </p>
      </header>

      {items.length === 0 ? (
        <div
          className="kz-panel"
          style={{
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--kitz-ink-3)',
          }}
        >
          Sin artefactos todavía. Crea una cotización o sube un documento para empezar.
        </div>
      ) : (
        <ol
          className="kz-panel"
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}
        >
          {items.map((it, i) => (
            <li key={it.id}>
              <Link
                href={it.href}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '5rem 1fr auto',
                  alignItems: 'baseline',
                  gap: '0.85rem',
                  padding: '0.7rem 0.85rem',
                  borderBottom:
                    i < items.length - 1 ? '1px solid var(--kitz-line)' : 'none',
                  textDecoration: 'none',
                  color: 'var(--kitz-ink)',
                  fontSize: '0.85rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.6rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color:
                      it.kind === 'invoice'
                        ? 'var(--kitz-accent-gold)'
                        : 'var(--kitz-ink-3)',
                    fontFamily: 'var(--kitz-font-mono)',
                    fontWeight: 600,
                  }}
                >
                  {it.kind === 'invoice' ? 'Factura' : 'Doc'}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span
                    style={{
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {it.label}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--kitz-ink-3)' }}>
                    {it.detail}
                  </span>
                </span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--kitz-ink-3)',
                    fontFamily: 'var(--kitz-font-mono)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {fmtRelative(it.updatedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
