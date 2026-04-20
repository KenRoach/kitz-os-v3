import Link from 'next/link';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME, resolveSession } from '@/lib/auth/session';
import { INVOICE_KIND_LABELS, INVOICE_STATUS_LABELS } from '@kitz/db/invoice-constants';
import { DOCUMENT_KIND_LABELS } from '@kitz/db/document-kinds';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Canvas · KitZ' };

function fmtMoney(n: number, currency: string): string {
  return new Intl.NumberFormat('es', { style: 'currency', currency }).format(n);
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 60) return `hace ${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr}h`;
  return `hace ${Math.floor(hr / 24)}d`;
}

/**
 * Canvas — unified gallery of generated artifacts.
 *
 * Aggregates the two artifact stores (invoices/quotes + documents)
 * into a single gallery view. Click anything to open the source
 * surface where you can edit it.
 */
export default async function CanvasGalleryPage() {
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

  const total = invoices.length + documents.length;

  return (
    <>
      <style>{`
        .kitz-canvas-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: 1fr;
        }
        @media (min-width: 640px) {
          .kitz-canvas-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
          .kitz-canvas-grid { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>

      <section
        style={{
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          height: '100%',
          overflow: 'auto',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Canvas</h1>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#666' }}>
              {total} artefacto{total === 1 ? '' : 's'} generado
              {total === 1 ? '' : 's'} · {invoices.length} cotización/factura
              {invoices.length === 1 ? '' : 'es'} · {documents.length} documento
              {documents.length === 1 ? '' : 's'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link
              href="/workspace/cotizaciones"
              style={{
                background: '#000',
                color: '#fff',
                border: '1px solid #000',
                padding: '0.4rem 0.8rem',
                fontSize: '0.75rem',
                textDecoration: 'none',
              }}
            >
              Cotización
            </Link>
            <Link
              href="/workspace/canvas/documentos"
              style={{
                background: '#fff',
                color: '#000',
                border: '1px solid #000',
                padding: '0.4rem 0.8rem',
                fontSize: '0.75rem',
                textDecoration: 'none',
              }}
            >
              Documento
            </Link>
          </div>
        </header>

        {total === 0 ? (
          <div
            className="kz-panel"
            style={{
              padding: '2.5rem',
              textAlign: 'center',
              color: 'var(--kitz-ink-2)',
            }}
          >
            <p style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: 'var(--kitz-ink)' }}>
              Aún no has creado nada en Canvas.
            </p>
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem' }}>
              Cotizaciones, facturas y documentos generados aparecen acá.
            </p>
          </div>
        ) : (
          <div className="kitz-canvas-grid">
            {invoices.map((inv) => (
              <Link
                key={inv.id}
                href="/workspace/cotizaciones"
                className="kz-panel"
                style={{
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  textDecoration: 'none',
                  color: 'var(--kitz-ink)',
                  minHeight: '8rem',
                }}
              >
                <div
                  style={{
                    fontSize: '0.6rem',
                    color: 'var(--kitz-accent-gold)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                  }}
                >
                  {INVOICE_KIND_LABELS[inv.kind]} · {INVOICE_STATUS_LABELS[inv.status]}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{inv.number}</div>
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--kitz-ink-2)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {inv.customer_name}
                </div>
                <div
                  style={{
                    marginTop: 'auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.7rem',
                    color: 'var(--kitz-ink-3)',
                  }}
                >
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {fmtMoney(inv.total, inv.currency)}
                  </span>
                  <span>{fmtRelative(inv.updated_at)}</span>
                </div>
              </Link>
            ))}
            {documents.map((d) => (
              <Link
                key={d.id}
                href="/workspace/canvas/documentos"
                className="kz-panel"
                style={{
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  textDecoration: 'none',
                  color: 'var(--kitz-ink)',
                  minHeight: '8rem',
                }}
              >
                <div
                  style={{
                    fontSize: '0.6rem',
                    color: 'var(--kitz-ink-3)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                  }}
                >
                  Documento · {DOCUMENT_KIND_LABELS[d.kind]}
                </div>
                <div
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {d.filename}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--kitz-ink-2)',
                  }}
                >
                  {d.status === 'extracted' ? 'Extracción completa' : d.status}
                </div>
                <div
                  style={{
                    marginTop: 'auto',
                    fontSize: '0.7rem',
                    color: 'var(--kitz-ink-3)',
                    textAlign: 'right',
                  }}
                >
                  {fmtRelative(d.updated_at)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
