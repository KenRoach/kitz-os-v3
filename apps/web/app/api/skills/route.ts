import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiEnvelope } from '@kitz/types';
import type { Skill } from '@kitz/db';
import { SKILL_KINDS } from '@kitz/db';
import { getDb } from '@/lib/db';
import { requireTenant } from '@/lib/auth/require-tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  slug: z.string().trim().min(2).max(64),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(400).optional(),
  kind: z.enum(SKILL_KINDS),
  source: z.string().trim().min(1).max(2000),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }
  const db = getDb();
  const items = await db.skills.list(auth.ctx.tenantId);
  const body: ApiEnvelope<{ items: Skill[] }> = {
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
    const input: Parameters<typeof db.skills.create>[1] = {
      slug: parsed.slug,
      name: parsed.name,
      kind: parsed.kind,
      source: parsed.source,
    };
    if (parsed.description) input.description = parsed.description;
    if (parsed.metadata) input.metadata = parsed.metadata;

    const created = await db.skills.create(auth.ctx.tenantId, input);
    await db.recordActivity({
      tenantId: auth.ctx.tenantId,
      actor: auth.ctx.userId,
      action: 'created_skill',
      entity: created.name,
    });
    const body: ApiEnvelope<Skill> = { success: true, data: created, error: null };
    return NextResponse.json(body, { status: 201 });
  } catch (err) {
    const reason =
      err instanceof Error && /invalid_|slug_taken/.test(err.message)
        ? err.message
        : 'create_failed';
    const status = reason === 'slug_taken' ? 409 : 400;
    const body: ApiEnvelope<null> = { success: false, data: null, error: reason };
    return NextResponse.json(body, { status });
  }
}
