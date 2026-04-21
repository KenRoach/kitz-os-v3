import { cookies } from 'next/headers';
import Link from 'next/link';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME, resolveSession } from '@/lib/auth/session';
import {
  buildReportsBundle,
  presetRange,
  type ReportsBundle,
  type DateRange,
} from '@/lib/reports/aggregations';
import { buildExtraBundle, type ExtraBundle } from '@/lib/reports/extra-aggregations';
import { Sparkline, MiniBars, Funnel } from '@/lib/reports/charts';
import RangePicker from './range-picker';
import InsightCard from './insight-card';
import AskBox from './ask-box';
import { ExportButton } from './export-button';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reportes · KitZ' };

type SearchParams = { range?: string };

const VALID = new Set(['today', '7d', '30d', '90d']);

function fmtMoney(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/**
 * Reportes — full business-owner reporting surface.
 *
 * Twelve operational reports across six categories (Prospectos,
 * Revenue, Customers, Comms, Calendar, Battery, Cash, Products,
 * Deals, Activity, Cycle, Revenue-trend). Ad-hoc range picker
 * (today / 7d / 30d / 90d), AI insight card that turns the bundle
 * into a Spanish narrative via the active agent, and a disclaimer
 * strip that makes the scope explicit:
 *
 *   "Reportes operativos para tomar decisiones día a día. No
 *    reemplazan la contabilidad ni los estados financieros que
 *    prepara tu contador."
 *
 * Per /frontend-design: single visual direction (terminal-Japandi),
 * Insight card spans full width as the focal moment with gold-accent
 * left border, the report cards use a 1/2/3-col responsive grid
 * (peer reports → uniform grid IS correct here; variation lives inside
 * each card via different content shapes + inline SVG charts).
 */
export default async function ReportesPage({
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

  return (
    <>
      <style>{`
        .kitz-reports-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: 1fr;
        }
        @media (min-width: 640px) {
          .kitz-reports-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
          .kitz-reports-grid { grid-template-columns: repeat(3, 1fr); }
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
            <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Reportes</h1>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#666' }}>
              {range.label} · {primary.tenant.name}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <RangePicker />
            <ExportButton />
          </div>
        </header>

        <InsightCard bundle={bundle} />

        <AskBox bundle={bundle} extra={extra} />

        <div className="kitz-reports-grid">
          <PipelineCard bundle={bundle} />
          <RevenueCard bundle={bundle} />
          <RevenueTrendCard extra={extra} />
          <CashProjectionCard extra={extra} />
          <CustomersCard bundle={bundle} />
          <DealOutcomesCard extra={extra} />
          <SalesCycleCard extra={extra} />
          <ProductRankingCard extra={extra} />
          <ActivityByChannelCard extra={extra} />
          <CommsCard bundle={bundle} />
          <CalendarCard bundle={bundle} />
          <BatteryCard bundle={bundle} />
        </div>

        <aside
          style={{
            marginTop: '0.5rem',
            borderTop: '1px solid #e5e2da',
            paddingTop: '0.85rem',
            fontSize: '0.7rem',
            color: '#666',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start',
          }}
        >
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--kitz-accent-gold, #b8884a)',
              marginTop: '0.35rem',
              flex: 'none',
            }}
          />
          <p style={{ margin: 0, lineHeight: 1.55 }}>
            Reportes operativos para tomar decisiones día a día. No reemplazan la
            contabilidad ni los estados financieros que prepara tu contador.
            Los cálculos se basan en facturas, cotizaciones y actividad registradas en
            KitZ; cualquier ingreso o gasto fuera del sistema no aparece acá.
          </p>
        </aside>
      </section>
    </>
  );
}

/* ─── Card primitives ─────────────────────────────────────────── */

function ReportCard({
  eyebrow,
  title,
  children,
  href,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  href?: string;
}) {
  return (
    <article
      className="kz-panel"
      style={{
        padding: '1.1rem 1.15rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        minHeight: '11rem',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '0.5rem',
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
          {eyebrow}
        </div>
        {href && (
          <Link
            href={href}
            style={{
              fontSize: '0.65rem',
              color: 'var(--kitz-ink-3)',
              textDecoration: 'none',
              letterSpacing: '0.05em',
            }}
          >
            Ver →
          </Link>
        )}
      </header>
      <h2 style={{ fontSize: '1rem', margin: 0 }}>{title}</h2>
      {children}
    </article>
  );
}

type StatEmphasis = 'gold' | 'moss' | 'danger' | undefined;
function Stat({
  label,
  value,
  sub,
  emphasis,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  emphasis?: StatEmphasis;
}) {
  const colorMap = {
    gold: 'var(--kitz-accent-gold)',
    moss: 'var(--kitz-moss)',
    danger: 'var(--kitz-danger)',
  } as const;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span
        style={{
          fontSize: '0.65rem',
          color: 'var(--kitz-ink-3)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '1.4rem',
          fontWeight: 600,
          color: emphasis ? colorMap[emphasis] : 'var(--kitz-ink)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: '0.7rem', color: 'var(--kitz-ink-3)' }}>{sub}</span>
      )}
    </div>
  );
}

/* ─── 6 report cards ──────────────────────────────────────────── */

function PipelineCard({ bundle }: { bundle: ReportsBundle }) {
  const { pipeline } = bundle;
  const stageOrder = ['nuevo', 'contactado', 'propuesta', 'negociacion', 'ganado', 'perdido'];
  const funnelItems = stageOrder
    .filter((s) => pipeline.byStage[s])
    .map((s) => ({ label: s, count: pipeline.byStage[s]!.count }));
  return (
    <ReportCard eyebrow="Ventas" title="Prospectos" href="/workspace/ventas">
      <Stat
        label="Tratos ganados"
        value={pipeline.wonInRange.count}
        sub={fmtMoney(pipeline.wonInRange.amountCents)}
        emphasis={pipeline.wonInRange.count > 0 ? 'moss' : undefined}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.6rem',
        }}
      >
        <Stat label="Total deals" value={pipeline.totalDeals} />
        <Stat label="Conversión" value={`${pipeline.conversionPct}%`} />
      </div>
      {funnelItems.length > 0 ? <Funnel stages={funnelItems} /> : null}
    </ReportCard>
  );
}

function RevenueCard({ bundle }: { bundle: ReportsBundle }) {
  const { revenue } = bundle;
  const overdue = revenue.ar.ninety + revenue.ar.sixty;
  return (
    <ReportCard eyebrow="Ingresos" title="Facturación" href="/workspace/cotizaciones">
      <Stat
        label="Pagado"
        value={fmtMoney(revenue.invoicesPaid.amountCents)}
        sub={`${revenue.invoicesPaid.count} factura${revenue.invoicesPaid.count === 1 ? '' : 's'}`}
        emphasis={revenue.invoicesPaid.amountCents > 0 ? 'moss' : undefined}
      />
      <Stat
        label="Por cobrar"
        value={fmtMoney(revenue.invoicesOutstanding.amountCents)}
        sub={
          overdue > 0
            ? `${fmtMoney(Math.round(overdue * 100))} vencido +60d`
            : `${revenue.invoicesOutstanding.count} factura${revenue.invoicesOutstanding.count === 1 ? '' : 's'}`
        }
        emphasis={overdue > 0 ? 'danger' : undefined}
      />
    </ReportCard>
  );
}

function CustomersCard({ bundle }: { bundle: ReportsBundle }) {
  const { customers } = bundle;
  return (
    <ReportCard eyebrow="Clientes" title="Clientes" href="/workspace/contactos">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.6rem',
        }}
      >
        <Stat
          label="Nuevos"
          value={customers.newInRange}
          emphasis={customers.newInRange > 0 ? 'gold' : undefined}
        />
        <Stat label="Total" value={customers.totalContacts} />
      </div>
      {customers.topByDealValue.length > 0 && (
        <div style={{ marginTop: '0.4rem' }}>
          <div
            style={{
              fontSize: '0.6rem',
              color: 'var(--kitz-ink-3)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Top por valor
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {customers.topByDealValue.slice(0, 3).map((c, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  padding: '0.2rem 0',
                  borderBottom: '1px solid var(--kitz-line)',
                }}
              >
                <span
                  style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {c.name}
                </span>
                <span
                  style={{
                    color: 'var(--kitz-ink-2)',
                    fontVariantNumeric: 'tabular-nums',
                    flexShrink: 0,
                  }}
                >
                  {fmtMoney(c.amountCents)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ReportCard>
  );
}

function CommsCard({ bundle }: { bundle: ReportsBundle }) {
  const { comms } = bundle;
  return (
    <ReportCard eyebrow="Comunicación" title="Conversaciones" href="/workspace/conversaciones">
      <Stat
        label="WhatsApp"
        value={comms.whatsappConnected > 0 ? 'Conectado' : 'Sin conectar'}
        emphasis={comms.whatsappConnected > 0 ? 'moss' : 'danger'}
        sub={
          comms.whatsappConnected > 0
            ? `${comms.whatsappConnected} sesión activa`
            : 'Conectar para empezar'
        }
      />
      <Stat
        label="Mensajes con KitZ"
        value={comms.messagesSentInRange}
        sub="enviados en periodo"
      />
    </ReportCard>
  );
}

function CalendarCard({ bundle }: { bundle: ReportsBundle }) {
  const { calendar } = bundle;
  return (
    <ReportCard eyebrow="Agenda" title="Calendario" href="/workspace/calendario">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.6rem',
        }}
      >
        <Stat label="Eventos" value={calendar.eventsInRange} />
        <Stat label="Horas" value={calendar.hoursBooked.toFixed(1)} />
      </div>
      <Stat
        label="Próximos 7 días"
        value={calendar.upcoming7d}
        emphasis={calendar.upcoming7d > 0 ? 'gold' : undefined}
      />
    </ReportCard>
  );
}

function BatteryCard({ bundle }: { bundle: ReportsBundle }) {
  const { battery } = bundle;
  const lowBalance = battery.balance < 50;
  return (
    <ReportCard eyebrow="IA" title="Batería" href="/workspace/ajustes/facturacion">
      <Stat
        label="Saldo"
        value={`${battery.balance} cr`}
        emphasis={lowBalance ? 'danger' : 'moss'}
        sub={`${battery.lifetimeTopup} cr cargados en total`}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.6rem',
        }}
      >
        <Stat label="Consumido" value={`-${battery.consumedInRange}`} sub="en periodo" />
        <Stat
          label="Recargas"
          value={battery.topupsInRange.count}
          sub={
            battery.topupsInRange.credits > 0
              ? `+${battery.topupsInRange.credits} cr`
              : 'sin recargas'
          }
        />
      </div>
    </ReportCard>
  );
}

/* ─── Extra SMB cards (revenue trend, cash, products, etc) ─────── */

function RevenueTrendCard({ extra }: { extra: ExtraBundle }) {
  const { revenueTrend } = extra;
  const values = revenueTrend.series.map((p) => p.amountCents);
  const monthLabel = (m: string) => m.slice(5); // 'YYYY-MM' → 'MM'
  const last = revenueTrend.series[revenueTrend.series.length - 1];
  const tone: 'moss' | 'danger' | 'ink' =
    revenueTrend.momChangePct > 0
      ? 'moss'
      : revenueTrend.momChangePct < 0
        ? 'danger'
        : 'ink';
  return (
    <ReportCard eyebrow="Ingresos" title="Tendencia 6 meses">
      <Stat
        label="Último mes cobrado"
        value={last ? fmtMoney(last.amountCents) : '—'}
        sub={
          revenueTrend.momChangePct === 0
            ? 'sin cambio mes a mes'
            : `${revenueTrend.momChangePct > 0 ? '+' : ''}${revenueTrend.momChangePct}% vs mes anterior`
        }
        emphasis={tone === 'ink' ? undefined : tone}
      />
      <Sparkline values={values} tone={tone} height={44} />
      <MiniBars
        items={revenueTrend.series.map((p) => ({
          label: monthLabel(p.month),
          value: p.amountCents,
        }))}
        height={40}
        tone="ink"
      />
    </ReportCard>
  );
}

function CashProjectionCard({ extra }: { extra: ExtraBundle }) {
  const { cashProjection } = extra;
  const total30_90 = cashProjection.next30 + cashProjection.next60 + cashProjection.next90;
  return (
    <ReportCard eyebrow="Caja" title="Proyección de cobro">
      <Stat
        label="Próximos 90 días"
        value={fmtMoney(total30_90 * 100)}
        sub={
          cashProjection.overdue > 0
            ? `${fmtMoney(cashProjection.overdue * 100)} vencido`
            : 'sin facturas vencidas'
        }
        emphasis={cashProjection.overdue > 0 ? 'danger' : undefined}
      />
      <MiniBars
        items={[
          { label: '30d', value: cashProjection.next30 },
          { label: '60d', value: cashProjection.next60 },
          { label: '90d', value: cashProjection.next90 },
        ]}
        height={50}
        tone="moss"
      />
    </ReportCard>
  );
}

function DealOutcomesCard({ extra }: { extra: ExtraBundle }) {
  const { dealOutcomes } = extra;
  const totalClosed = dealOutcomes.won + dealOutcomes.lost;
  const winRate = totalClosed > 0 ? Math.round((dealOutcomes.won / totalClosed) * 100) : 0;
  return (
    <ReportCard eyebrow="Ventas" title="Resultados de tratos">
      <Stat
        label="Tasa de cierre"
        value={`${winRate}%`}
        sub={`${dealOutcomes.won} ganados · ${dealOutcomes.lost} perdidos`}
        emphasis={winRate >= 50 ? 'moss' : winRate === 0 ? undefined : 'danger'}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
        <Stat label="Trato promedio" value={fmtMoney(dealOutcomes.avgDealSizeCents)} />
        <Stat label="Abiertos al cierre" value={dealOutcomes.openAtEnd} />
      </div>
    </ReportCard>
  );
}

function SalesCycleCard({ extra }: { extra: ExtraBundle }) {
  const { salesCycle } = extra;
  return (
    <ReportCard eyebrow="Ventas" title="Ciclo de venta">
      <Stat
        label="Días promedio cotización → ganado"
        value={salesCycle.avgDaysQuoteToWon !== null ? `${salesCycle.avgDaysQuoteToWon}d` : '—'}
        sub={
          salesCycle.sample > 0
            ? `basado en ${salesCycle.sample} trato${salesCycle.sample === 1 ? '' : 's'}`
            : 'sin tratos ganados aún'
        }
      />
      <Stat
        label="Valor promedio por trato ganado"
        value={salesCycle.avgDealSize > 0 ? fmtMoney(salesCycle.avgDealSize * 100) : '—'}
      />
    </ReportCard>
  );
}

function ProductRankingCard({ extra }: { extra: ExtraBundle }) {
  const { productRanking } = extra;
  if (productRanking.top.length === 0) {
    return (
      <ReportCard eyebrow="Catálogo" title="Top productos" href="/workspace/productos">
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>
          Sin productos aún. Cuando envíes cotizaciones con líneas, el top 10 aparece acá.
        </p>
      </ReportCard>
    );
  }
  const top5 = productRanking.top.slice(0, 5);
  const max = Math.max(...top5.map((r) => r.revenueCents), 1);
  return (
    <ReportCard eyebrow="Catálogo" title="Top productos" href="/workspace/productos">
      <Stat
        label="Producto líder"
        value={top5[0]!.description.slice(0, 32)}
        sub={fmtMoney(top5[0]!.revenueCents)}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {top5.map((row) => (
          <div
            key={row.description}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 2rem 4rem',
              gap: '0.5rem',
              alignItems: 'center',
              fontSize: '0.7rem',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span
              title={row.description}
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {row.description}
            </span>
            <div
              aria-hidden
              style={{
                height: 6,
                background: '#111',
                width: `${(row.revenueCents / max) * 100}%`,
                minWidth: 1,
              }}
            />
            <span style={{ textAlign: 'right', color: '#666' }}>
              {fmtMoney(row.revenueCents)}
            </span>
          </div>
        ))}
      </div>
    </ReportCard>
  );
}

function ActivityByChannelCard({ extra }: { extra: ExtraBundle }) {
  const { activityByChannel: a } = extra;
  const items = [
    { label: 'WA', value: a.whatsapp },
    { label: 'Fact', value: a.invoice },
    { label: 'Trato', value: a.deal },
    { label: 'Cont.', value: a.contact },
    { label: 'Otro', value: a.other },
  ];
  return (
    <ReportCard eyebrow="Operativo" title="Actividad por canal">
      <Stat
        label="Eventos en rango"
        value={a.totalInRange}
        sub={`${a.whatsapp} WhatsApp · ${a.invoice} facturas`}
      />
      <MiniBars items={items} height={50} tone="ink" />
    </ReportCard>
  );
}
