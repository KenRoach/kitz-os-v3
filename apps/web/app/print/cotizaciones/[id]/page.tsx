/**
 * Print-ready quote / invoice page.
 *
 * Opened in a second window from the Cotizaciones list via
 * window.open('/workspace/cotizaciones/<id>/print'). The page is
 * intentionally free of the workspace chrome — no nav, no chat,
 * no sidebar — because:
 *
 *   1. The user prints it via the browser's "Save as PDF" flow, so
 *      every pixel matters.
 *   2. The customer sees the exact same document if they preview
 *      the PDF (no accidental KitZ branding leaks through).
 *
 * Visual language:
 *   - A4-width centered column (210mm) with 20mm internal padding.
 *   - System font fallback stack tuned for Windows / macOS / iOS
 *     print engines; we avoid variable web fonts because browsers
 *     are inconsistent about subsetting in print output.
 *   - Accent color from BrandSettings drives the title bar + totals
 *     strip. Everything else stays ink-on-paper for max legibility.
 *   - Uses <table> for line items because it's the one HTML element
 *     browsers handle consistently across print engines.
 *
 * Auto-print: a tiny client island triggers window.print() on load
 * and closes the window when the user either cancels or finishes,
 * so "Ver / imprimir" feels like a single action.
 */

import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME, resolveSession } from '@/lib/auth/session';
import { brandStore } from '@/lib/brand/store';
import { INVOICE_KIND_LABELS, INVOICE_STATUS_LABELS } from '@kitz/db/invoice-constants';
import { AutoPrint } from './auto-print';

// Route lives under /print/... so it sits outside the workspace
// layout — no nav rail, no chat dock, no setup pill bleed into the
// printed PDF. Auth is enforced in-page below.

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Documento · KitZ' };

function fmtMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('es', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const db = getDb();
  const session = await resolveSession(db, token);
  const primary = session ? await db.findPrimaryTenant(session.user_id) : null;
  if (!session || !primary) return null;

  const invoice = await db.invoices.get(primary.tenant.id, id);
  if (!invoice) notFound();

  const brand = brandStore.get(primary.tenant.id, primary.tenant.name);

  const isQuote = invoice.kind === 'quote';
  const docLabel = INVOICE_KIND_LABELS[invoice.kind];
  const statusLabel = INVOICE_STATUS_LABELS[invoice.status];

  return (
    <>
      <style>{`
        :root { color-scheme: light; }
        html, body {
          margin: 0;
          padding: 0;
          background: #f2f0eb;
          color: #111;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .sheet {
          width: 210mm;
          min-height: 297mm;
          margin: 1.5rem auto;
          padding: 20mm;
          background: #fff;
          box-shadow: 0 6px 40px rgba(0,0,0,0.12);
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .title-bar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 3px solid var(--accent);
        }
        .brand {
          display: flex;
          gap: 1rem;
          align-items: center;
        }
        .brand img {
          max-width: 64px;
          max-height: 64px;
          object-fit: contain;
        }
        .brand-name {
          font-size: 1.05rem;
          font-weight: 700;
          letter-spacing: 0.01em;
        }
        .brand-meta {
          font-size: 0.72rem;
          color: #555;
          line-height: 1.45;
          margin-top: 0.15rem;
        }
        .doc-meta {
          text-align: right;
        }
        .doc-kind {
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 0.7rem;
          color: var(--accent);
          font-weight: 600;
        }
        .doc-number {
          font-size: 1.35rem;
          font-weight: 700;
          margin-top: 0.15rem;
        }
        .doc-status {
          font-size: 0.7rem;
          margin-top: 0.2rem;
          color: #555;
        }
        .parties {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          font-size: 0.78rem;
        }
        .parties h3 {
          font-size: 0.65rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #888;
          margin: 0 0 0.35rem;
          font-weight: 600;
        }
        .parties p {
          margin: 0;
          line-height: 1.55;
          white-space: pre-line;
        }
        table.items {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.78rem;
          margin-top: 0.5rem;
        }
        table.items thead th {
          text-align: left;
          padding: 0.6rem 0.5rem;
          background: #f4f2ec;
          border-top: 1px solid #ddd;
          border-bottom: 1px solid #ddd;
          font-size: 0.65rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #555;
          font-weight: 600;
        }
        table.items tbody td {
          padding: 0.55rem 0.5rem;
          border-bottom: 1px solid #eee;
          vertical-align: top;
        }
        table.items td.num,
        table.items th.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .totals {
          display: flex;
          justify-content: flex-end;
          padding: 0.75rem 0.5rem;
        }
        .totals table {
          font-size: 0.8rem;
          border-collapse: collapse;
        }
        .totals td {
          padding: 0.25rem 0.75rem;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .totals tr.total-row td {
          border-top: 2px solid var(--accent);
          font-weight: 700;
          font-size: 0.95rem;
          padding-top: 0.5rem;
          color: var(--accent);
        }
        .notes, .footer {
          font-size: 0.72rem;
          color: #555;
          line-height: 1.55;
        }
        .footer {
          margin-top: auto;
          padding-top: 1rem;
          border-top: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          gap: 1rem;
        }
        .powered {
          font-size: 0.6rem;
          color: #999;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        @media print {
          html, body { background: #fff; }
          .sheet { box-shadow: none; margin: 0; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
      <AutoPrint />
      <article className="sheet" style={{ ['--accent' as string]: brand.accentColor }}>
        <header className="title-bar">
          <div className="brand">
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logoUrl} alt={`${brand.businessName} logo`} />
            ) : null}
            <div>
              <div className="brand-name">{brand.businessName}</div>
              <div className="brand-meta">
                {brand.taxId ? <div>ID fiscal: {brand.taxId}</div> : null}
                {brand.address ? <div>{brand.address}</div> : null}
                {brand.email || brand.phone ? (
                  <div>
                    {brand.email ?? ''}
                    {brand.email && brand.phone ? ' · ' : ''}
                    {brand.phone ?? ''}
                  </div>
                ) : null}
                {brand.website ? <div>{brand.website}</div> : null}
              </div>
            </div>
          </div>
          <div className="doc-meta">
            <div className="doc-kind">{docLabel}</div>
            <div className="doc-number">{invoice.number}</div>
            <div className="doc-status">
              {fmtDate(invoice.created_at)} · {statusLabel}
            </div>
            {invoice.due_at ? (
              <div className="doc-status">Vence: {fmtDate(invoice.due_at)}</div>
            ) : null}
          </div>
        </header>

        <section className="parties">
          <div>
            <h3>{isQuote ? 'Cotización para' : 'Facturar a'}</h3>
            <p>
              <strong>{invoice.customer_name}</strong>
              {invoice.customer_email ? `\n${invoice.customer_email}` : ''}
            </p>
          </div>
          <div>
            <h3>Moneda</h3>
            <p>{invoice.currency}</p>
          </div>
        </section>

        <table className="items">
          <thead>
            <tr>
              <th>Descripción</th>
              <th className="num" style={{ width: '4rem' }}>
                Cant.
              </th>
              <th className="num" style={{ width: '7rem' }}>
                Precio
              </th>
              <th className="num" style={{ width: '7rem' }}>
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={i}>
                <td>{item.description}</td>
                <td className="num">{item.quantity}</td>
                <td className="num">{fmtMoney(item.unitPrice, invoice.currency)}</td>
                <td className="num">
                  {fmtMoney(item.quantity * item.unitPrice, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="totals">
          <table>
            <tbody>
              <tr>
                <td>Subtotal</td>
                <td>{fmtMoney(invoice.subtotal, invoice.currency)}</td>
              </tr>
              <tr>
                <td>Impuesto ({(invoice.tax_rate * 100).toFixed(1)}%)</td>
                <td>{fmtMoney(invoice.tax, invoice.currency)}</td>
              </tr>
              <tr className="total-row">
                <td>Total</td>
                <td>{fmtMoney(invoice.total, invoice.currency)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {invoice.notes ? (
          <section className="notes">
            <strong>Notas</strong>
            <p style={{ margin: '0.25rem 0 0', whiteSpace: 'pre-line' }}>{invoice.notes}</p>
          </section>
        ) : null}

        <footer className="footer">
          <span>{brand.footerNote ?? ''}</span>
          <span className="powered">Hecho con KitZ</span>
        </footer>
      </article>
    </>
  );
}
