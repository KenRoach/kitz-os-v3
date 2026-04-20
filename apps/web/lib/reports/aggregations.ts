/**
 * Reports aggregations — pure functions over the DbClient store calls.
 *
 * Each report rolls up real tenant data into a small typed payload that
 * the report cards consume. Server-only; runs in a Server Component or
 * an /api/reports route.
 *
 * All windows are inclusive of `from`, exclusive of `to` (ISO strings).
 */

import type { DbClient, Deal, Invoice } from '@kitz/db';

export type DateRange = { from: string; to: string; label: string };

export type PipelineReport = {
  byStage: Record<string, { count: number; amountCents: number }>;
  totalDeals: number;
  totalAmountCents: number;
  wonInRange: { count: number; amountCents: number };
  conversionPct: number;
};

export type RevenueReport = {
  invoicesPaid: { count: number; amountCents: number };
  invoicesOutstanding: { count: number; amountCents: number };
  ar: { current: number; thirty: number; sixty: number; ninety: number };
  topQuotesInRange: { number: string; customer: string; total: number; status: string }[];
};

export type CustomersReport = {
  totalContacts: number;
  newInRange: number;
  topByDealValue: { name: string; amountCents: number }[];
};

export type CommsReport = {
  whatsappConnected: number;
  unreadProxy: number;
  messagesSentInRange: number;
};

export type CalendarReport = {
  eventsInRange: number;
  hoursBooked: number;
  upcoming7d: number;
};

export type BatteryReport = {
  balance: number;
  lifetimeTopup: number;
  lifetimeDebit: number;
  consumedInRange: number;
  topupsInRange: { count: number; credits: number };
};

export type ReportsBundle = {
  range: DateRange;
  pipeline: PipelineReport;
  revenue: RevenueReport;
  customers: CustomersReport;
  comms: CommsReport;
  calendar: CalendarReport;
  battery: BatteryReport;
};

function isoNow(): string {
  return new Date().toISOString();
}

export function presetRange(preset: 'today' | '7d' | '30d' | '90d'): DateRange {
  const now = new Date();
  const to = new Date(now);
  to.setDate(to.getDate() + 1);
  to.setHours(0, 0, 0, 0);
  const from = new Date(to);
  switch (preset) {
    case 'today':
      from.setDate(to.getDate() - 1);
      break;
    case '7d':
      from.setDate(to.getDate() - 7);
      break;
    case '30d':
      from.setDate(to.getDate() - 30);
      break;
    case '90d':
      from.setDate(to.getDate() - 90);
      break;
  }
  const labels = {
    today: 'Hoy',
    '7d': 'Últimos 7 días',
    '30d': 'Últimos 30 días',
    '90d': 'Últimos 90 días',
  } as const;
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    label: labels[preset],
  };
}

function inRange(iso: string | null | undefined, range: DateRange): boolean {
  if (!iso) return false;
  return iso >= range.from && iso < range.to;
}

async function buildPipeline(db: DbClient, tenantId: string, range: DateRange): Promise<PipelineReport> {
  const all = await db.deals.list(tenantId);
  const byStage: PipelineReport['byStage'] = {};
  let totalAmountCents = 0;
  for (const d of all as Deal[]) {
    const cents = Math.round((d.amount ?? 0) * 100);
    totalAmountCents += cents;
    const slot = (byStage[d.stage] ??= { count: 0, amountCents: 0 });
    slot.count += 1;
    slot.amountCents += cents;
  }
  const wonAll = all.filter((d) => d.stage === 'ganado');
  const wonInWindow = wonAll.filter((d) => inRange(d.created_at, range));
  const wonInRange = {
    count: wonInWindow.length,
    amountCents: wonInWindow.reduce((s, d) => s + Math.round(d.amount * 100), 0),
  };
  const closedInWindow = all.filter(
    (d) => inRange(d.created_at, range) && (d.stage === 'ganado' || d.stage === 'perdido'),
  );
  const conversionPct =
    closedInWindow.length > 0
      ? Math.round((wonInWindow.length / closedInWindow.length) * 100)
      : 0;
  return {
    byStage,
    totalDeals: all.length,
    totalAmountCents,
    wonInRange,
    conversionPct,
  };
}

async function buildRevenue(db: DbClient, tenantId: string, range: DateRange): Promise<RevenueReport> {
  const all: Invoice[] = await db.invoices.list(tenantId);
  const invoices = all.filter((i) => i.kind === 'invoice');
  const paid = invoices.filter((i) => i.status === 'paid');
  const outstanding = invoices.filter(
    (i) => i.status !== 'paid' && i.status !== 'cancelled' && i.status !== 'expired',
  );
  const now = isoNow();
  const dayMs = 86400000;
  const ar = { current: 0, thirty: 0, sixty: 0, ninety: 0 };
  for (const inv of outstanding) {
    if (!inv.due_at) {
      ar.current += inv.total;
      continue;
    }
    const ageDays = Math.floor((Date.parse(now) - Date.parse(inv.due_at)) / dayMs);
    if (ageDays < 1) ar.current += inv.total;
    else if (ageDays < 30) ar.thirty += inv.total;
    else if (ageDays < 60) ar.sixty += inv.total;
    else ar.ninety += inv.total;
  }
  const quotes = all.filter((i) => i.kind === 'quote' && inRange(i.created_at, range));
  const topQuotesInRange = quotes
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((q) => ({
      number: q.number,
      customer: q.customer_name,
      total: q.total,
      status: q.status,
    }));
  return {
    invoicesPaid: {
      count: paid.length,
      amountCents: paid.reduce((s, i) => s + Math.round(i.total * 100), 0),
    },
    invoicesOutstanding: {
      count: outstanding.length,
      amountCents: outstanding.reduce((s, i) => s + Math.round(i.total * 100), 0),
    },
    ar,
    topQuotesInRange,
  };
}

async function buildCustomers(
  db: DbClient,
  tenantId: string,
  range: DateRange,
): Promise<CustomersReport> {
  const [contactsPage, deals] = await Promise.all([
    db.contacts.list(tenantId),
    db.deals.list(tenantId),
  ]);
  const contacts = contactsPage.items;
  const newInRange = contacts.filter((c) => inRange(c.created_at, range)).length;
  const byContact = new Map<string, number>();
  for (const d of deals) {
    if (!d.contact_id) continue;
    byContact.set(d.contact_id, (byContact.get(d.contact_id) ?? 0) + Math.round(d.amount * 100));
  }
  const top = Array.from(byContact.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, amountCents]) => {
      const c = contacts.find((c) => c.id === id);
      return { name: c?.name ?? '—', amountCents };
    });
  return {
    totalContacts: contactsPage.total,
    newInRange,
    topByDealValue: top,
  };
}

async function buildComms(db: DbClient, tenantId: string, range: DateRange): Promise<CommsReport> {
  const [whatsappConnected, activity] = await Promise.all([
    db.whatsapp.countConnected(tenantId),
    db.listRecentActivity(tenantId, 200),
  ]);
  const messagesSentInRange = activity.filter(
    (a) => a.action === 'sent_message' && inRange(a.created_at, range),
  ).length;
  return {
    whatsappConnected,
    // Stub: real implementation would query unread WhatsApp + chat threads.
    unreadProxy: 0,
    messagesSentInRange,
  };
}

async function buildCalendar(
  db: DbClient,
  tenantId: string,
  range: DateRange,
): Promise<CalendarReport> {
  const [windowEvents, sevenDayEvents] = await Promise.all([
    db.calendar.list(tenantId, { from: range.from, to: range.to }),
    (async () => {
      const start = new Date();
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return db.calendar.list(tenantId, { from: start.toISOString(), to: end.toISOString() });
    })(),
  ]);
  const hoursBooked = windowEvents.reduce((sum, e) => {
    return sum + (Date.parse(e.end_at) - Date.parse(e.start_at)) / 3600000;
  }, 0);
  return {
    eventsInRange: windowEvents.length,
    hoursBooked: Math.round(hoursBooked * 10) / 10,
    upcoming7d: sevenDayEvents.length,
  };
}

async function buildBattery(
  db: DbClient,
  tenantId: string,
  range: DateRange,
): Promise<BatteryReport> {
  const [battery, ledger] = await Promise.all([
    db.billing.getBattery(tenantId),
    db.billing.ledger(tenantId, 200),
  ]);
  const inWindow = ledger.filter((e) => inRange(e.created_at, range));
  const consumedInRange = inWindow.filter((e) => e.delta < 0).reduce((s, e) => s + -e.delta, 0);
  const topups = inWindow.filter((e) => e.reason.startsWith('topup_'));
  const topupsInRange = {
    count: topups.length,
    credits: topups.reduce((s, e) => s + e.delta, 0),
  };
  return {
    balance: battery.balance,
    lifetimeTopup: battery.lifetime_topup,
    lifetimeDebit: battery.lifetime_debit,
    consumedInRange,
    topupsInRange,
  };
}

export async function buildReportsBundle(
  db: DbClient,
  tenantId: string,
  range: DateRange,
): Promise<ReportsBundle> {
  const [pipeline, revenue, customers, comms, calendar, battery] = await Promise.all([
    buildPipeline(db, tenantId, range),
    buildRevenue(db, tenantId, range),
    buildCustomers(db, tenantId, range),
    buildComms(db, tenantId, range),
    buildCalendar(db, tenantId, range),
    buildBattery(db, tenantId, range),
  ]);
  return { range, pipeline, revenue, customers, comms, calendar, battery };
}
