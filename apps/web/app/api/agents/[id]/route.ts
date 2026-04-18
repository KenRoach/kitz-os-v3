import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiEnvelope } from '@kitz/types';
import type { Agent } from '@kitz/db';
import { AGENT_MODELS } from '@kitz/db';
import { TOOL_IDS } from '@kitz/agents';
import { getDb } from '@/lib/db';
import { requireTenant } from '@/lib/auth/require-tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(400).nullable().optional(),
  systemPrompt: z.string().trim().min(4).max(8000).optional(),
  model: z.enum(AGENT_MODELS).optional(),
  tools: z.array(z.string()).max(50).optional(),
  skills: z.array(z.string()).max(50).optional(),
  isActive: z.boolean().optional(),
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
  const agent = await db.agents.get(auth.ctx.tenantId, id);
  if (!agent) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'not_found' };
    return NextResponse.json(body, { status: 404 });
  }
  const body: ApiEnvelope<Agent> = { success: true, data: agent, error: null };
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
    if (v === undefined) continue;
    if (k === 'tools' && Array.isArray(v)) {
      const known = new Set<string>(TOOL_IDS);
      patch['tools'] = (v as string[]).filter((t) => known.has(t));
    } else {
      patch[k] = v;
    }
  }

  try {
    const updated = await db.agents.update(
      auth.ctx.tenantId,
      id,
      patch as Parameters<typeof db.agents.update>[2],
    );
    if (!updated) {
      const body: ApiEnvelope<null> = { success: false, data: null, error: 'not_found' };
      return NextResponse.json(body, { status: 404 });
    }
    const body: ApiEnvelope<Agent> = { success: true, data: updated, error: null };
    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    const reason =
      err instanceof Error && err.message === 'last_active_agent'
        ? 'last_active_agent'
        : 'update_failed';
    const status = reason === 'last_active_agent' ? 409 : 400;
    const body: ApiEnvelope<null> = { success: false, data: null, error: reason };
    return NextResponse.json(body, { status });
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
  const ok = await db.agents.remove(auth.ctx.tenantId, id);
  if (!ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'not_found' };
    return NextResponse.json(body, { status: 404 });
  }
  const body: ApiEnvelope<null> = { success: true, data: null, error: null };
  return NextResponse.json(body, { status: 200 });
}
