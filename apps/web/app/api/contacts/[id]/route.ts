import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiEnvelope } from '@kitz/types';
import type { Contact } from '@kitz/db';
import { getDb } from '@/lib/db';
import { requireTenant } from '@/lib/auth/require-tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  email: z
    .string()
    .email()
    .max(320)
    .optional()
    .or(z.literal('').transform(() => null))
    .nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  company: z.string().trim().max(200).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  notes: z.string().trim().max(4000).optional().nullable(),
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
  const contact = await db.contacts.get(auth.ctx.tenantId, id);
  if (!contact) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'not_found' };
    return NextResponse.json(body, { status: 404 });
  }
  const body: ApiEnvelope<Contact> = { success: true, data: contact, error: null };
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
  // Strip undefined keys to satisfy exactOptionalPropertyTypes on ContactPatch.
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (v !== undefined) patch[k] = v;
  }
  const updated = await db.contacts.update(
    auth.ctx.tenantId,
    id,
    patch as Parameters<typeof db.contacts.update>[2],
  );
  if (!updated) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'not_found' };
    return NextResponse.json(body, { status: 404 });
  }
  const body: ApiEnvelope<Contact> = { success: true, data: updated, error: null };
  return NextResponse.json(body, { status: 200 });
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
  const removed = await db.contacts.remove(auth.ctx.tenantId, id);
  if (!removed) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'not_found' };
    return NextResponse.json(body, { status: 404 });
  }
  const body: ApiEnvelope<null> = { success: true, data: null, error: null };
  return NextResponse.json(body, { status: 200 });
}
