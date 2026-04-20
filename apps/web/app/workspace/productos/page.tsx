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
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Productos</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#666' }}>
            Derivado de las cotizaciones y facturas que has enviado.
          </p>
        </div>
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
          Nueva cotización
        </Link>
      </header>

      {products.length === 0 ? (
        <div
          style={{
            padding: '2rem',
            border: '1px dashed #999',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: '#666',
          }}
        >
          Sin productos. Cuando envíes cotizaciones con líneas de producto, aparecerán acá
          ordenadas por frecuencia.
        </div>
      ) : (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.8rem',
            border: '1px solid #000',
          }}
        >
          <thead style={{ background: '#f4f4f4' }}>
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
                      padding: '0.5rem',
                      borderBottom: '1px solid #000',
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
                  <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
                    <td
                      style={{
                        padding: '0.5rem',
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
                        padding: '0.5rem',
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {p.timesQuoted}
                    </td>
                    <td
                      style={{
                        padding: '0.5rem',
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        color: '#666',
                      }}
                    >
                      {p.totalQuantity}
                    </td>
                    <td
                      style={{
                        padding: '0.5rem',
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {fmtMoney(p.avgUnitPrice, currency)}
                    </td>
                    <td
                      style={{
                        padding: '0.5rem',
                        textAlign: 'right',
                        color: '#666',
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
      )}
    </section>
  );
}
