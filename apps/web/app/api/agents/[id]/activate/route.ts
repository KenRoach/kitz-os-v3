import { NextResponse } from 'next/server';
import type { ApiEnvelope } from '@kitz/types';
import type { Agent } from '@kitz/db';
import { getDb } from '@/lib/db';
import { requireTenant } from '@/lib/auth/require-tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params): Promise<Response> {
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
  const updated = await db.agents.setActive(auth.ctx.tenantId, id);
  if (!updated) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'not_found' };
    return NextResponse.json(body, { status: 404 });
  }

  await db.recordActivity({
    tenantId: auth.ctx.tenantId,
    actor: auth.ctx.userId,
    action: 'activated_agent',
    entity: updated.name,
  });

  const body: ApiEnvelope<Agent> = { success: true, data: updated, error: null };
  return NextResponse.json(body, { status: 200 });
}
