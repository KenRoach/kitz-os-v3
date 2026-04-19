import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiEnvelope } from '@kitz/types';
import type { Invoice, InvoiceKind, InvoiceStatus } from '@kitz/db';
import { INVOICE_KINDS, INVOICE_STATUSES } from '@kitz/db/invoice-constants';
import { getDb } from '@/lib/db';
import { requireTenant } from '@/lib/auth/require-tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const lineItemSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.number().positive().max(100_000),
  unitPrice: z.number().min(0).max(1_000_000_000),
});

const createSchema = z.object({
  kind: z.enum(INVOICE_KINDS),
  customerName: z.string().trim().min(1).max(200),
  items: z.array(lineItemSchema).min(1).max(200),
  customerEmail: z.string().trim().email().max(320).optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
  taxRate: z.number().min(0).max(1).optional(),
  currency: z.string().trim().length(3).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
  number: z.string().trim().min(1).max(80).optional(),
});

export async function GET(request: Request): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }
  const url = new URL(request.url);
  const opts: { kind?: InvoiceKind; status?: InvoiceStatus } = {};
  const kind = url.searchParams.get('kind');
  const status = url.searchParams.get('status');
  if (kind && (INVOICE_KINDS as readonly string[]).includes(kind)) {
    opts.kind = kind as InvoiceKind;
  }
  if (status && (INVOICE_STATUSES as readonly string[]).includes(status)) {
    opts.status = status as InvoiceStatus;
  }
  const db = getDb();
  const items = await db.invoices.list(auth.ctx.tenantId, opts);
  const body: ApiEnvelope<{ items: Invoice[] }> = {
    success: true,
    data: { items },
    error: null,
  };
  return NextResponse.json(body, { status: 200 });
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }
  if (auth.ctx.role === 'viewer') {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'forbidden' };
    return NextResponse.json(body, { status: 403 });
  }

  let parsed: z.infer<typeof createSchema>;
  try {
    parsed = createSchema.parse(await request.json());
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'invalid_body' };
    return NextResponse.json(body, { status: 400 });
  }

  const db = getDb();
  try {
    const input: Parameters<typeof db.invoices.create>[1] = {
      kind: parsed.kind,
      customerName: parsed.customerName,
      items: parsed.items,
    };
    if (parsed.customerEmail !== undefined) input.customerEmail = parsed.customerEmail;
    if (parsed.contactId !== undefined) input.contactId = parsed.contactId;
    if (parsed.taxRate !== undefined) input.taxRate = parsed.taxRate;
    if (parsed.currency) input.currency = parsed.currency;
    if (parsed.notes !== undefined) input.notes = parsed.notes;
    if (parsed.dueAt !== undefined) input.dueAt = parsed.dueAt;
    if (parsed.number) input.number = parsed.number;

    const created = await db.invoices.create(auth.ctx.tenantId, input);
    await db.recordActivity({
      tenantId: auth.ctx.tenantId,
      actor: auth.ctx.userId,
      action: created.kind === 'quote' ? 'created_quote' : 'created_invoice',
      entity: created.number,
    });
    const body: ApiEnvelope<Invoice> = { success: true, data: created, error: null };
    return NextResponse.json(body, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'create_failed';
    const known = ['invalid_items', 'invalid_customer', 'invalid_tax_rate', 'number_taken'];
    const reason = known.includes(message) ? message : 'create_failed';
    const status = reason === 'number_taken' ? 409 : 400;
    const body: ApiEnvelope<null> = { success: false, data: null, error: reason };
    return NextResponse.json(body, { status });
  }
}
