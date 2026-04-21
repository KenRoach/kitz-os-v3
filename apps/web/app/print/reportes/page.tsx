/**
 * Print-ready Reportes dashboard.
 *
 * Same pattern as /print/cotizaciones/[id]: lives outside the
 * workspace layout so the rail / chat / sandbox banner / setup pill
 * never bleed into the PDF. AutoPrint client island fires
 * window.print() and closes on afterprint.
 *
 * What goes on the sheet:
 *   - Brand header (logo + business name + tax id) — picked up from
 *     the same brandStore that powers the quote print route. One
 *     consistent identity across every export.
 *   - Title row with "Reporte operativo" + period label + "generado
 *     {fecha}" so the recipient knows what they're looking at.
 *   - 12 mini-blocks in a 2-column grid: same metrics the dashboard
 *     shows, but as plain numbers (no SVG charts — those don't
 *     reliably render in print engines, and small mono numbers are
 *     more legible at A4).
 *   - Top-of-mind highlights: top 5 productos by revenue, top 5
 *     contactos by deal value, AR aging table.
 *   - Disclaimer footer at the bottom — visible on every page so
 *     readers don't confuse this with an accountant's report.
 *
 * Read params:
 *   ?range=today|7d|30d|90d  (default: 30d, mirrors the dashboard)
 */

import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME, resolveSession } from '@/lib/auth/session';
import { brandStore } from '@/lib/brand/store';
import {
  buildReportsBundle,
  presetRange,
  type DateRange,
} from '@/lib/reports/aggregations';
import { buildExtraBundle } from '@/lib/reports/extra-aggregations';
import { AutoPrint } from './auto-print';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reporte · KitZ' };

type SearchParams = { range?: string };
const VALID = new Set(['today', '7d', '30d', '90d']);

function fmtMoney(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function fmtCents(cents: number, currency = 'USD'): string {
  return fmtMoney(cents / 100, currency);
}

function fmtDateLong(): string {
  return new Date().toLocaleDateString('es', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default async function PrintReportesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const db = getDb();
  const session = await resolveSession(db, token);
  const primary = session ? await db.findPrimaryTenant(session.user_id) : null;
  if (!session || !primary) return null;

  const presetId = (sp.range && VALID.has(sp.range) ? sp.range : '30d') as
    | 'today'
    | '7d'
    | '30d'
    | '90d';
  const range: DateRange = presetRange(presetId);
  const [bundle, extra] = await Promise.all([
    buildReportsBundle(db, primary.tenant.id, range),
    buildExtraBundle(db, primary.tenant.id, range),
  ]);
  const brand = brandStore.get(primary.tenant.id, primary.tenant.name);
  const currency = brand.defaultCurrency || 'USD';

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
          padding: 18mm;
          background: #fff;
          box-shadow: 0 6px 40px rgba(0,0,0,0.12);
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .title-bar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          padding-bottom: 0.85rem;
          border-bottom: 3px solid var(--accent);
        }
        .brand {
          display: flex;
          gap: 0.85rem;
          align-items: center;
        }
        .brand img {
          max-width: 56px;
          max-height: 56px;
          object-fit: contain;
        }
        .brand-name {
          font-size: 1rem;
          font-weight: 700;
        }
        .brand-meta {
          font-size: 0.7rem;
          color: #555;
          line-height: 1.45;
          margin-top: 0.1rem;
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
        .doc-period {
          font-size: 1.1rem;
          font-weight: 700;
          margin-top: 0.15rem;
        }
        .doc-status {
          font-size: 0.7rem;
          margin-top: 0.2rem;
          color: #555;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.6rem;
        }
        .block {
          border: 1px solid #e5e2da;
          padding: 0.6rem 0.75rem;
          break-inside: avoid;
        }
        .block h4 {
          margin: 0 0 0.4rem;
          font-size: 0.6rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #888;
          font-weight: 600;
        }
        .block .v {
          font-size: 1.05rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }
        .block .s {
          font-size: 0.7rem;
          color: #666;
          margin-top: 0.15rem;
          line-height: 1.4;
        }
        .row { display: flex; justify-content: space-between; gap: 0.5rem; }
        table.list {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.72rem;
        }
        table.list thead th {
          text-align: left;
          padding: 0.4rem 0.4rem;
          background: #f4f2ec;
          border-top: 1px solid #ddd;
          border-bottom: 1px solid #ddd;
          font-size: 0.6rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #555;
          font-weight: 600;
        }
        table.list tbody td {
          padding: 0.4rem;
          border-bottom: 1px solid #eee;
          vertical-align: top;
        }
        table.list td.num {
          text-align: right;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        section.cluster {
          break-inside: avoid;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        section.cluster > h3 {
          margin: 0;
          font-size: 0.65rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--accent);
          font-weight: 600;
        }
        .footer {
          margin-top: auto;
          padding-top: 0.85rem;
          border-top: 1px solid #eee;
          font-size: 0.62rem;
          color: #666;
          line-height: 1.55;
          display: flex;
          justify-content: space-between;
          gap: 1rem;
        }
        .powered {
          font-size: 0.55rem;
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
              </div>
            </div>
          </div>
          <div className="doc-meta">
            <div className="doc-kind">Reporte operativo</div>
            <div className="doc-period">{range.label}</div>
            <div className="doc-status">Generado {fmtDateLong()}</div>
          </div>
        </header>

        {/* Top-line metrics */}
        <section className="cluster">
          <h3>Resumen</h3>
          <div className="grid-2">
            <div className="block">
              <h4>Tratos ganados</h4>
              <div className="v">{bundle.pipeline.wonInRange.count}</div>
              <div className="s">
                {fmtCents(bundle.pipeline.wonInRange.amountCents, currency)} ·
                {' '}conversión {bundle.pipeline.conversionPct}%
              </div>
            </div>
            <div className="block">
              <h4>Facturas pagadas</h4>
              <div className="v">
                {fmtCents(bundle.revenue.invoicesPaid.amountCents, currency)}
              </div>
              <div className="s">{bundle.revenue.invoicesPaid.count} facturas en periodo</div>
            </div>
            <div className="block">
              <h4>Por cobrar</h4>
              <div className="v">
                {fmtCents(bundle.revenue.invoicesOutstanding.amountCents, currency)}
              </div>
              <div className="s">
                {bundle.revenue.invoicesOutstanding.count} facturas pendientes
              </div>
            </div>
            <div className="block">
              <h4>Contactos nuevos</h4>
              <div className="v">{bundle.customers.newInRange}</div>
              <div className="s">{bundle.customers.totalContacts} totales</div>
            </div>
          </div>
        </section>

        {/* Cash + revenue trend */}
        <section className="cluster">
          <h3>Caja & Ingresos</h3>
          <div className="grid-2">
            <div className="block">
              <h4>Proyección de cobro</h4>
              <div className="v">
                {fmtMoney(
                  extra.cashProjection.next30 +
                    extra.cashProjection.next60 +
                    extra.cashProjection.next90,
                  currency,
                )}
              </div>
              <div className="s">
                30d {fmtMoney(extra.cashProjection.next30, currency)} · 60d{' '}
                {fmtMoney(extra.cashProjection.next60, currency)} · 90d{' '}
                {fmtMoney(extra.cashProjection.next90, currency)}
              </div>
              {extra.cashProjection.overdue > 0 ? (
                <div className="s" style={{ color: '#a00', marginTop: '0.2rem' }}>
                  Vencido: {fmtMoney(extra.cashProjection.overdue, currency)}
                </div>
              ) : null}
            </div>
            <div className="block">
              <h4>Tendencia 6 meses</h4>
              <div className="v">
                {fmtCents(
                  extra.revenueTrend.series[extra.revenueTrend.series.length - 1]?.amountCents ??
                    0,
                  currency,
                )}
              </div>
              <div className="s">
                {extra.revenueTrend.momChangePct === 0
                  ? 'sin cambio mes a mes'
                  : `${extra.revenueTrend.momChangePct > 0 ? '+' : ''}${extra.revenueTrend.momChangePct}% vs mes anterior`}
              </div>
            </div>
          </div>

          <table className="list">
            <thead>
              <tr>
                <th>Mes</th>
                <th className="num">Facturas</th>
                <th className="num">Cobrado</th>
              </tr>
            </thead>
            <tbody>
              {extra.revenueTrend.series.map((p) => (
                <tr key={p.month}>
                  <td>{p.month}</td>
                  <td className="num">{p.invoiceCount}</td>
                  <td className="num">{fmtCents(p.amountCents, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* AR aging */}
        <section className="cluster">
          <h3>Antigüedad de cuentas por cobrar</h3>
          <table className="list">
            <thead>
              <tr>
                <th>Tramo</th>
                <th className="num">Monto</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Al día</td>
                <td className="num">{fmtMoney(bundle.revenue.ar.current, currency)}</td>
              </tr>
              <tr>
                <td>1–30 días</td>
                <td className="num">{fmtMoney(bundle.revenue.ar.thirty, currency)}</td>
              </tr>
              <tr>
                <td>31–60 días</td>
                <td className="num">{fmtMoney(bundle.revenue.ar.sixty, currency)}</td>
              </tr>
              <tr>
                <td>60+ días</td>
                <td className="num" style={{ color: bundle.revenue.ar.ninety > 0 ? '#a00' : undefined }}>
                  {fmtMoney(bundle.revenue.ar.ninety, currency)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Pipeline + cycle */}
        <section className="cluster">
          <h3>Prospectos</h3>
          <div className="grid-2">
            <div className="block">
              <h4>Resultados de tratos</h4>
              <div className="v">
                {extra.dealOutcomes.won + extra.dealOutcomes.lost > 0
                  ? `${Math.round((extra.dealOutcomes.won / (extra.dealOutcomes.won + extra.dealOutcomes.lost)) * 100)}%`
                  : '—'}
              </div>
              <div className="s">
                {extra.dealOutcomes.won} ganados · {extra.dealOutcomes.lost} perdidos ·{' '}
                {extra.dealOutcomes.openAtEnd} abiertos
              </div>
              <div className="s">
                Trato promedio: {fmtCents(extra.dealOutcomes.avgDealSizeCents, currency)}
              </div>
            </div>
            <div className="block">
              <h4>Ciclo de venta</h4>
              <div className="v">
                {extra.salesCycle.avgDaysQuoteToWon !== null
                  ? `${extra.salesCycle.avgDaysQuoteToWon}d`
                  : '—'}
              </div>
              <div className="s">
                Cotización → ganado · n={extra.salesCycle.sample}
              </div>
              <div className="s">
                Valor promedio:{' '}
                {extra.salesCycle.avgDealSize > 0
                  ? fmtMoney(extra.salesCycle.avgDealSize, currency)
                  : '—'}
              </div>
            </div>
          </div>
        </section>

        {/* Top productos + top customers */}
        {extra.productRanking.top.length > 0 ? (
          <section className="cluster">
            <h3>Top productos por ingreso</h3>
            <table className="list">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="num">Veces cotizado</th>
                  <th className="num">Cantidad</th>
                  <th className="num">Ingreso</th>
                </tr>
              </thead>
              <tbody>
                {extra.productRanking.top.slice(0, 5).map((row) => (
                  <tr key={row.description}>
                    <td>{row.description}</td>
                    <td className="num">{row.timesQuoted}</td>
                    <td className="num">{row.totalQuantity}</td>
                    <td className="num">{fmtCents(row.revenueCents, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {bundle.customers.topByDealValue.length > 0 ? (
          <section className="cluster">
            <h3>Top clientes por valor de tratos</h3>
            <table className="list">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th className="num">Valor acumulado</th>
                </tr>
              </thead>
              <tbody>
                {bundle.customers.topByDealValue.map((c) => (
                  <tr key={c.name}>
                    <td>{c.name}</td>
                    <td className="num">{fmtCents(c.amountCents, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {/* Operativo */}
        <section className="cluster">
          <h3>Operativo</h3>
          <div className="grid-2">
            <div className="block">
              <h4>Calendario</h4>
              <div className="v">{bundle.calendar.eventsInRange}</div>
              <div className="s">
                {bundle.calendar.hoursBooked}h reservadas · {bundle.calendar.upcoming7d} próximos 7d
              </div>
            </div>
            <div className="block">
              <h4>Comunicaciones</h4>
              <div className="v">{extra.activityByChannel.totalInRange}</div>
              <div className="s">
                {extra.activityByChannel.whatsapp} WhatsApp ·{' '}
                {extra.activityByChannel.invoice} facturas ·{' '}
                {extra.activityByChannel.deal} tratos ·{' '}
                {extra.activityByChannel.contact} contactos
              </div>
            </div>
          </div>
        </section>

        <footer className="footer">
          <span>
            Reporte operativo para tomar decisiones día a día. No reemplaza la contabilidad
            ni los estados financieros que prepara tu contador. Los cálculos se basan en
            facturas, cotizaciones y actividad registradas en KitZ.
          </span>
          <span className="powered">Hecho con KitZ</span>
        </footer>
      </article>
    </>
  );
}
