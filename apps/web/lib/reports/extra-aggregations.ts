/**
 * Extra small-business reports that round out the original 6 bundles.
 *
 * These share the same DateRange contract (inclusive from, exclusive
 * to) and compile to typed payloads the report cards render.
 *
 * Design principles:
 *   - Pure, async, DbClient-in / typed-payload-out. No HTTP, no UI.
 *   - Small fixed series sizes (6 months, 3 cash buckets, top 10
 *     products) so the wire payload stays small and Sparklines don't
 *     explode on wide monitors.
 *   - All currency math is done in minor units (cents) to sidestep
 *     floating-point drift. Rounded once at render.
 *   - None of these replace accounting — operational signals only.
 */

import type { DbClient, Invoice, Deal } from '@kitz/db';
import type { DateRange } from './aggregations';

export type RevenueTrendPoint = {
  /** 'YYYY-MM' bucket for the calendar month. */
  month: string;
  amountCents: number;
  invoiceCount: number;
};

export type RevenueTrendReport = {
  /** Oldest → newest; always 6 rows. */
  series: RevenueTrendPoint[];
  momChangePct: number;
};

export type SalesCycleReport = {
  avgDaysQuoteToWon: number | null;
  avgDealSize: number;
  /** Sample size used to compute the averages. */
  sample: number;
};

export type CashProjectionReport = {
  /** Expected incoming cash in the next 30/60/90 day windows, from
   * outstanding (non-cancelled, non-paid, non-expired) invoices
   * whose due_at falls in each window. Overdue invoices go into
   * `overdue` rather than the forward windows. */
  next30: number;
  next60: number;
  next90: number;
  overdue: number;
};

export type ProductRankingRow = {
  description: string;
  timesQuoted: number;
  totalQuantity: number;
  revenueCents: number;
};

export type ProductRankingReport = {
  top: ProductRankingRow[];
};

export type ActivityByChannelReport = {
  whatsapp: number;
  invoice: number;
  deal: number;
  contact: number;
  other: number;
  totalInRange: number;
};

export type DealOutcomesReport = {
  won: number;
  lost: number;
  openAtEnd: number;
  avgDealSizeCents: number;
};

export type ExtraBundle = {
  revenueTrend: RevenueTrendReport;
  salesCycle: SalesCycleReport;
  cashProjection: CashProjectionReport;
  productRanking: ProductRankingReport;
  activityByChannel: ActivityByChannelReport;
  dealOutcomes: DealOutcomesReport;
};

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function inRange(iso: string | null | undefined, range: DateRange): boolean {
  if (!iso) return false;
  return iso >= range.from && iso < range.to;
}

async function buildRevenueTrend(
  db: DbClient,
  tenantId: string,
): Promise<RevenueTrendReport> {
  const all: Invoice[] = await db.invoices.list(tenantId);
  const now = new Date();
  const buckets = new Map<string, RevenueTrendPoint>();
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.set(monthKey(d), { month: monthKey(d), amountCents: 0, invoiceCount: 0 });
  }
  for (const inv of all) {
    if (inv.kind !== 'invoice' || inv.status !== 'paid') continue;
    const key = monthKey(new Date(inv.created_at));
    const slot = buckets.get(key);
    if (!slot) continue;
    slot.amountCents += Math.round(inv.total * 100);
    slot.invoiceCount += 1;
  }
  const series = Array.from(buckets.values());
  const last = series[series.length - 1]!;
  const prev = series[series.length - 2]!;
  const momChangePct =
    prev.amountCents > 0
      ? Math.round(((last.amountCents - prev.amountCents) / prev.amountCents) * 100)
      : 0;
  return { series, momChangePct };
}

async function buildSalesCycle(
  db: DbClient,
  tenantId: string,
): Promise<SalesCycleReport> {
  const [deals, invoices] = await Promise.all([
    db.deals.list(tenantId),
    db.invoices.list(tenantId),
  ]);
  const wonDeals = (deals as Deal[]).filter((d) => d.stage === 'ganado');
  const quotesByContact = new Map<string, string>();
  for (const inv of invoices as Invoice[]) {
    if (inv.kind !== 'quote') continue;
    const key = inv.customer_name.trim().toLowerCase();
    const existing = quotesByContact.get(key);
    if (!existing || inv.created_at < existing) {
      quotesByContact.set(key, inv.created_at);
    }
  }
  const samples: number[] = [];
  for (const d of wonDeals) {
    // Deals don't carry a direct link back to the originating quote
    // in the stub schema, so we pair by contact name as a proxy.
    // Good enough for a directional metric.
    const contactName = d.title.toLowerCase();
    const earliestQuote = [...quotesByContact.entries()]
      .filter(([name]) => contactName.includes(name) || name.includes(contactName.slice(0, 12)))
      .map(([, iso]) => iso)
      .sort()[0];
    if (!earliestQuote) continue;
    const days = (Date.parse(d.created_at) - Date.parse(earliestQuote)) / 86400000;
    if (days >= 0 && days < 365) samples.push(days);
  }
  const avg = samples.length > 0 ? samples.reduce((s, n) => s + n, 0) / samples.length : null;
  const avgDealSize =
    wonDeals.length > 0
      ? wonDeals.reduce((s, d) => s + d.amount, 0) / wonDeals.length
      : 0;
  return {
    avgDaysQuoteToWon: avg !== null ? Math.round(avg) : null,
    avgDealSize: Math.round(avgDealSize * 100) / 100,
    sample: samples.length,
  };
}

async function buildCashProjection(
  db: DbClient,
  tenantId: string,
): Promise<CashProjectionReport> {
  const all: Invoice[] = await db.invoices.list(tenantId);
  const now = Date.now();
  const dayMs = 86400000;
  const res: CashProjectionReport = { next30: 0, next60: 0, next90: 0, overdue: 0 };
  for (const inv of all) {
    if (inv.kind !== 'invoice') continue;
    if (inv.status === 'paid' || inv.status === 'cancelled' || inv.status === 'expired') continue;
    if (!inv.due_at) continue;
    const days = (Date.parse(inv.due_at) - now) / dayMs;
    if (days < 0) {
      res.overdue += inv.total;
    } else if (days <= 30) {
      res.next30 += inv.total;
    } else if (days <= 60) {
      res.next60 += inv.total;
    } else if (days <= 90) {
      res.next90 += inv.total;
    }
  }
  return res;
}

async function buildProductRanking(
  db: DbClient,
  tenantId: string,
): Promise<ProductRankingReport> {
  const all: Invoice[] = await db.invoices.list(tenantId);
  const map = new Map<string, ProductRankingRow>();
  for (const inv of all) {
    for (const item of inv.items) {
      const key = item.description.trim().toLowerCase();
      if (!key) continue;
      const row =
        map.get(key) ??
        ({
          description: item.description.trim(),
          timesQuoted: 0,
          totalQuantity: 0,
          revenueCents: 0,
        } as ProductRankingRow);
      row.timesQuoted += 1;
      row.totalQuantity += item.quantity;
      row.revenueCents += Math.round(item.quantity * item.unitPrice * 100);
      map.set(key, row);
    }
  }
  const top = Array.from(map.values())
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 10);
  return { top };
}

async function buildActivityByChannel(
  db: DbClient,
  tenantId: string,
  range: DateRange,
): Promise<ActivityByChannelReport> {
  const activity = await db.listRecentActivity(tenantId, 500);
  const inWindow = activity.filter((a) => inRange(a.created_at, range));
  const res = { whatsapp: 0, invoice: 0, deal: 0, contact: 0, other: 0 };
  for (const a of inWindow) {
    if (a.action.startsWith('whatsapp_')) res.whatsapp += 1;
    else if (a.action.startsWith('invoice_')) res.invoice += 1;
    else if (a.action.startsWith('deal_')) res.deal += 1;
    else if (a.action.startsWith('contact_')) res.contact += 1;
    else res.other += 1;
  }
  return { ...res, totalInRange: inWindow.length };
}

async function buildDealOutcomes(
  db: DbClient,
  tenantId: string,
  range: DateRange,
): Promise<DealOutcomesReport> {
  const all = (await db.deals.list(tenantId)) as Deal[];
  const won = all.filter((d) => d.stage === 'ganado' && inRange(d.created_at, range));
  const lost = all.filter((d) => d.stage === 'perdido' && inRange(d.created_at, range));
  const openAtEnd = all.filter(
    (d) =>
      d.stage !== 'ganado' &&
      d.stage !== 'perdido' &&
      d.created_at < range.to,
  ).length;
  const avgDealSizeCents =
    won.length > 0
      ? Math.round(won.reduce((s, d) => s + d.amount * 100, 0) / won.length)
      : 0;
  return {
    won: won.length,
    lost: lost.length,
    openAtEnd,
    avgDealSizeCents,
  };
}

export async function buildExtraBundle(
  db: DbClient,
  tenantId: string,
  range: DateRange,
): Promise<ExtraBundle> {
  const [
    revenueTrend,
    salesCycle,
    cashProjection,
    productRanking,
    activityByChannel,
    dealOutcomes,
  ] = await Promise.all([
    buildRevenueTrend(db, tenantId),
    buildSalesCycle(db, tenantId),
    buildCashProjection(db, tenantId),
    buildProductRanking(db, tenantId),
    buildActivityByChannel(db, tenantId, range),
    buildDealOutcomes(db, tenantId, range),
  ]);
  return {
    revenueTrend,
    salesCycle,
    cashProjection,
    productRanking,
    activityByChannel,
    dealOutcomes,
  };
}
