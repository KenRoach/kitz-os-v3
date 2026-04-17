import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiEnvelope } from '@kitz/types';
import type { Deal, DealStage } from '@kitz/db';
import { DEAL_STAGES } from '@kitz/db';
import { getDb } from '@/lib/db';
import { requireTenant } from '@/lib/auth/require-tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  amount: z.number().nonnegative().max(1_000_000_000).optional(),
  currency: z.string().trim().length(3).optional(),
  stage: z.enum(DEAL_STAGES).optional(),
  probability: z.number().min(0).max(100).optional(),
  contactId: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(4000).optional(),
});

function parseStage(v: string | null): DealStage | undefined {
  if (!v) return undefined;
  return (DEAL_STAGES as readonly string[]).includes(v) ? (v as DealStage) : undefined;
}

export async function GET(request: Request): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }
  const url = new URL(request.url);
  const stage = parseStage(url.searchParams.get('stage'));
  const db = getDb();
  const [items, summary] = await Promise.all([
    db.deals.list(auth.ctx.tenantId, stage ? { stage } : undefined),
    db.deals.summary(auth.ctx.tenantId),
  ]);
  const body: ApiEnvelope<{ items: Deal[]; summary: typeof summary }> = {
    success: true,
    data: { items, summary },
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
  const input: Parameters<typeof db.deals.create>[1] = { title: parsed.title };
  if (parsed.amount !== undefined) input.amount = parsed.amount;
  if (parsed.currency) input.currency = parsed.currency;
  if (parsed.stage) input.stage = parsed.stage;
  if (parsed.probability !== undefined) input.probability = parsed.probability;
  if (parsed.contactId !== undefined) input.contactId = parsed.contactId;
  if (parsed.notes) input.notes = parsed.notes;

  const created = await db.deals.create(auth.ctx.tenantId, input);
  await db.recordActivity({
    tenantId: auth.ctx.tenantId,
    actor: auth.ctx.userId,
    action: 'created_deal',
    entity: created.title,
  });

  const body: ApiEnvelope<Deal> = { success: true, data: created, error: null };
  return NextResponse.json(body, { status: 201 });
}
