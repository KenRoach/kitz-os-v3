import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiEnvelope } from '@kitz/types';
import type { Contact } from '@kitz/db';
import { getDb } from '@/lib/db';
import { requireTenant } from '@/lib/auth/require-tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().email().max(320).optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(200).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  notes: z.string().trim().max(4000).optional(),
});

export async function GET(request: Request): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }
  const url = new URL(request.url);
  const query = url.searchParams.get('q') ?? undefined;
  const limit = Number(url.searchParams.get('limit') ?? '50');
  const offset = Number(url.searchParams.get('offset') ?? '0');

  const db = getDb();
  const opts: { query?: string; limit: number; offset: number } = {
    limit: Number.isFinite(limit) ? limit : 50,
    offset: Number.isFinite(offset) ? offset : 0,
  };
  if (query) opts.query = query;
  const { items, total } = await db.contacts.list(auth.ctx.tenantId, opts);

  const body: ApiEnvelope<{ items: Contact[] }> = {
    success: true,
    data: { items },
    error: null,
    meta: { total, limit: opts.limit, offset: opts.offset },
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
  const input: Parameters<typeof db.contacts.create>[1] = { name: parsed.name };
  if (parsed.email) input.email = parsed.email;
  if (parsed.phone) input.phone = parsed.phone;
  if (parsed.company) input.company = parsed.company;
  if (parsed.tags) input.tags = parsed.tags;
  if (parsed.notes) input.notes = parsed.notes;

  const created = await db.contacts.create(auth.ctx.tenantId, input);
  await db.recordActivity({
    tenantId: auth.ctx.tenantId,
    actor: auth.ctx.userId,
    action: 'created_contact',
    entity: created.name,
  });

  const body: ApiEnvelope<Contact> = { success: true, data: created, error: null };
  return NextResponse.json(body, { status: 201 });
}
