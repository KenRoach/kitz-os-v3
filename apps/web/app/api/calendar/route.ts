import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiEnvelope } from '@kitz/types';
import type { CalendarEvent } from '@kitz/db';
import { getDb } from '@/lib/db';
import { requireTenant } from '@/lib/auth/require-tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  description: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(200).optional(),
  attendees: z.array(z.string().trim().max(320)).max(50).optional(),
  contactId: z.string().uuid().optional().nullable(),
});

export async function GET(request: Request): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }
  const url = new URL(request.url);
  const opts: { from?: string; to?: string } = {};
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  if (from) opts.from = from;
  if (to) opts.to = to;
  const db = getDb();
  const items = await db.calendar.list(auth.ctx.tenantId, opts);
  const body: ApiEnvelope<{ items: CalendarEvent[] }> = {
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
    const input: Parameters<typeof db.calendar.create>[1] = {
      title: parsed.title,
      startAt: parsed.startAt,
      endAt: parsed.endAt,
    };
    if (parsed.description) input.description = parsed.description;
    if (parsed.location) input.location = parsed.location;
    if (parsed.attendees) input.attendees = parsed.attendees;
    if (parsed.contactId !== undefined) input.contactId = parsed.contactId;

    const created = await db.calendar.create(auth.ctx.tenantId, input);
    await db.recordActivity({
      tenantId: auth.ctx.tenantId,
      actor: auth.ctx.userId,
      action: 'created_event',
      entity: created.title,
    });
    const body: ApiEnvelope<CalendarEvent> = { success: true, data: created, error: null };
    return NextResponse.json(body, { status: 201 });
  } catch (err) {
    const reason =
      err instanceof Error && /invalid_/.test(err.message) ? err.message : 'create_failed';
    const body: ApiEnvelope<null> = { success: false, data: null, error: reason };
    return NextResponse.json(body, { status: 400 });
  }
}
