import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiEnvelope } from '@kitz/types';
import type { Invoice } from '@kitz/db';
import { INVOICE_STATUSES } from '@kitz/db/invoice-constants';
import { getDb } from '@/lib/db';
import { requireTenant } from '@/lib/auth/require-tenant';
import { eventBus } from '@/lib/stream/bus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const lineItemSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.number().positive().max(100_000),
  unitPrice: z.number().min(0).max(1_000_000_000),
});

const patchSchema = z.object({
  customerName: z.string().trim().min(1).max(200).optional(),
  customerEmail: z.string().trim().email().max(320).nullable().optional(),
  contactId: z.string().uuid().nullable().optional(),
  items: z.array(lineItemSchema).min(1).max(200).optional(),
  taxRate: z.number().min(0).max(1).optional(),
  currency: z.string().trim().length(3).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  status: z.enum(INVOICE_STATUSES).optional(),
  pdfUrl: z.string().trim().url().max(2000).nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }
  const { id } = await params;
  const db = getDb();
  const found = await db.invoices.get(auth.ctx.tenantId, id);
  if (!found) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'not_found' };
    return NextResponse.json(body, { status: 404 });
  }
  const body: ApiEnvelope<Invoice> = { success: true, data: found, error: null };
  return NextResponse.json(body, { status: 200 });
}

export async function PATCH(request: Request, { params }: Params): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }
  if (auth.ctx.role === 'viewer') {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'forbidden' };
    return NextResponse.json(body, { status: 403 });
  }
  const { id } = await params;
  let parsed: z.infer<typeof patchSchema>;
  try {
    parsed = patchSchema.parse(await request.json());
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'invalid_body' };
    return NextResponse.json(body, { status: 400 });
  }
  const db = getDb();
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (v !== undefined) patch[k] = v;
  }
  try {
    // Capture the pre-update status so we only fire invoice.paid once,
    // on the draft/sent → paid transition. Re-patching an already-paid
    // invoice shouldn't re-toast every client.
    const before = await db.invoices.get(auth.ctx.tenantId, id);
    const updated = await db.invoices.update(
      auth.ctx.tenantId,
      id,
      patch as Parameters<typeof db.invoices.update>[2],
    );
    if (!updated) {
      const body: ApiEnvelope<null> = { success: false, data: null, error: 'not_found' };
      return NextResponse.json(body, { status: 404 });
    }

    if (before && before.status !== 'paid' && updated.status === 'paid') {
      eventBus.emit(auth.ctx.tenantId, {
        kind: 'invoice.paid',
        invoiceId: updated.id,
        number: updated.number,
        total: updated.total,
        currency: updated.currency,
        at: new Date().toISOString(),
      });
    }

    const body: ApiEnvelope<Invoice> = { success: true, data: updated, error: null };
    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'update_failed';
    const known = ['invalid_items', 'invalid_tax_rate'];
    const reason = known.includes(message) ? message : 'update_failed';
    const body: ApiEnvelope<null> = { success: false, data: null, error: reason };
    return NextResponse.json(body, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: Params): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }
  if (auth.ctx.role === 'viewer') {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'forbidden' };
    return NextResponse.json(body, { status: 403 });
  }
  const { id } = await params;
  const db = getDb();
  const ok = await db.invoices.remove(auth.ctx.tenantId, id);
  if (!ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'not_found' };
    return NextResponse.json(body, { status: 404 });
  }
  const body: ApiEnvelope<null> = { success: true, data: null, error: null };
  return NextResponse.json(body, { status: 200 });
}
