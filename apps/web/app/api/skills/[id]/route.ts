import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiEnvelope } from '@kitz/types';
import type { Skill } from '@kitz/db';
import { SKILL_KINDS } from '@kitz/db';
import { getDb } from '@/lib/db';
import { requireTenant } from '@/lib/auth/require-tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(400).nullable().optional(),
  kind: z.enum(SKILL_KINDS).optional(),
  source: z.string().trim().min(1).max(2000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
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
  const skill = await db.skills.get(auth.ctx.tenantId, id);
  if (!skill) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'not_found' };
    return NextResponse.json(body, { status: 404 });
  }
  const body: ApiEnvelope<Skill> = { success: true, data: skill, error: null };
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
    const updated = await db.skills.update(
      auth.ctx.tenantId,
      id,
      patch as Parameters<typeof db.skills.update>[2],
    );
    if (!updated) {
      const body: ApiEnvelope<null> = { success: false, data: null, error: 'not_found' };
      return NextResponse.json(body, { status: 404 });
    }
    const body: ApiEnvelope<Skill> = { success: true, data: updated, error: null };
    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    const reason =
      err instanceof Error && /invalid_/.test(err.message) ? err.message : 'update_failed';
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
  const ok = await db.skills.remove(auth.ctx.tenantId, id);
  if (!ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'not_found' };
    return NextResponse.json(body, { status: 404 });
  }
  const body: ApiEnvelope<null> = { success: true, data: null, error: null };
  return NextResponse.json(body, { status: 200 });
}
