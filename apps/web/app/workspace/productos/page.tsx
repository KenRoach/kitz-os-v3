import Link from 'next/link';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME, resolveSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Productos · KitZ' };

type ProductRow = {
  description: string;
  timesQuoted: number;
  totalQuantity: number;
  avgUnitPrice: number;
  lastSeen: string;
  currencies: Set<string>;
};

function fmtMoney(n: number, currency: string): string {
  return new Intl.NumberFormat('es', { style: 'currency', currency }).format(n);
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const day = Math.floor(ms / 86400000);
  if (day < 1) return 'hoy';
  if (day < 7) return `hace ${day}d`;
  return `hace ${Math.floor(day / 7)}sem`;
}

/**
 * Productos — derived catalog from invoice + cotización line items.
 *
 * KitZ doesn't have a dedicated products store yet — that's coming.
 * Until then we mine the existing invoices for a "frequently sold"
 * view: each unique line-item description becomes a row with how
 * many times it was quoted, total quantity sold, average unit price,
 * and when it was last seen. This gives owners a real "what sells"
 * answer from day one without us having to build inventory.
 */
export default async function ProductosPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const db = getDb();
  const session = await resolveSession(db, token);
  const primary = session ? await db.findPrimaryTenant(session.user_id) : null;
  if (!session || !primary) return null;

  const invoices = await db.invoices.list(primary.tenant.id);

  const byProduct = new Map<string, ProductRow>();
  for (const inv of invoices) {
    for (const item of inv.items) {
      const key = item.description.trim().toLowerCase();
      if (!key) continue;
      const row = byProduct.get(key) ?? {
        description: item.description.trim(),
        timesQuoted: 0,
        totalQuantity: 0,
        avgUnitPrice: 0,
        lastSeen: inv.created_at,
        currencies: new Set<string>(),
      };
      row.timesQuoted += 1;
      row.totalQuantity += item.quantity;
      // Running average of unit price across appearances.
      row.avgUnitPrice =
        row.avgUnitPrice + (item.unitPrice - row.avgUnitPrice) / row.timesQuoted;
      if (inv.created_at > row.lastSeen) row.lastSeen = inv.created_at;
      row.currencies.add(inv.currency);
      byProduct.set(key, row);
    }
  }

  const products = Array.from(byProduct.values()).sort((a, b) => b.timesQuoted - a.timesQuoted);

  return (
    <section
      style={{
        padding: 'clamp(1rem, 2.5vw, 2rem)',
        maxWidth: '72rem',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <p className="kz-mute kz-prompt" style={{ marginBottom: '0.5rem' }}>
            kitz catalog
          </p>
          <h1 style={{ marginBottom: '0.25rem' }}>Productos</h1>
          <p className="kz-mute" style={{ margin: 0 }}>
            Derivado de las cotizaciones y facturas que has enviado.
          </p>
        </div>
        <Link
          href="/workspace/cotizaciones"
          className="kz-button"
          style={{
            width: 'auto',
            padding: '0.45rem 0.85rem',
            fontSize: '0.7rem',
            textDecoration: 'none',
          }}
        >
          + Nueva cotización
        </Link>
      </header>

      {products.length === 0 ? (
        <div
          className="kz-panel"
          style={{
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--kitz-ink-2)',
          }}
        >
          <p style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: 'var(--kitz-ink)' }}>
            Aún no hay productos.
          </p>
          <p style={{ margin: '0 0 1rem', fontSize: '0.85rem' }}>
            Cuando envíes cotizaciones con líneas de producto, aparecerán acá ordenadas
            por frecuencia.
          </p>
          <Link
            href="/workspace/cotizaciones"
            className="kz-button"
            style={{
              width: 'auto',
              padding: '0.5rem 1rem',
              fontSize: '0.75rem',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Crear primera cotización
          </Link>
        </div>
      ) : (
        <div className="kz-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.85rem',
            }}
          >
            <thead style={{ background: 'var(--kitz-sunk)' }}>
              <tr>
                {[
                  { label: 'Producto', align: 'left' as const },
                  { label: 'Cotizado', align: 'right' as const },
                  { label: 'Total cantidad', align: 'right' as const },
                  { label: 'Precio prom.', align: 'right' as const },
                  { label: 'Última vez', align: 'right' as const },
                ].map((h) => (
                  <th
                    key={h.label}
                    style={{
                      textAlign: h.align,
                      padding: '0.6rem 0.85rem',
                      borderBottom: '1px solid var(--kitz-line-strong)',
                      fontSize: '0.65rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--kitz-ink-3)',
                      fontWeight: 600,
                    }}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => {
                const currency = Array.from(p.currencies)[0] ?? 'USD';
                return (
                  <tr
                    key={i}
                    style={{
                      borderBottom:
                        i < products.length - 1 ? '1px solid var(--kitz-line)' : 'none',
                    }}
                  >
                    <td
                      style={{
                        padding: '0.55rem 0.85rem',
                        maxWidth: '24rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.description}
                    </td>
                    <td
                      style={{
                        padding: '0.55rem 0.85rem',
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {p.timesQuoted}
                    </td>
                    <td
                      style={{
                        padding: '0.55rem 0.85rem',
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        color: 'var(--kitz-ink-2)',
                      }}
                    >
                      {p.totalQuantity}
                    </td>
                    <td
                      style={{
                        padding: '0.55rem 0.85rem',
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {fmtMoney(p.avgUnitPrice, currency)}
                    </td>
                    <td
                      style={{
                        padding: '0.55rem 0.85rem',
                        textAlign: 'right',
                        color: 'var(--kitz-ink-3)',
                        fontSize: '0.75rem',
                      }}
                    >
                      {fmtRelative(p.lastSeen)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
