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

const createSchema = z.object({
  slug: z.string().trim().min(2).max(64),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(400).optional(),
  systemPrompt: z.string().trim().min(4).max(8000),
  model: z.enum(AGENT_MODELS).optional(),
  tools: z.array(z.string()).max(50).optional(),
  skills: z.array(z.string()).max(50).optional(),
  isActive: z.boolean().optional(),
});

function pruneTools(tools: string[] | undefined): string[] | undefined {
  if (!tools) return undefined;
  const known = new Set<string>(TOOL_IDS);
  return tools.filter((t) => known.has(t));
}

export async function GET(): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }
  const db = getDb();
  const items = await db.agents.list(auth.ctx.tenantId);
  const active = await db.agents.getActive(auth.ctx.tenantId);
  const body: ApiEnvelope<{ items: Agent[]; activeId: string | null }> = {
    success: true,
    data: { items, activeId: active?.id ?? null },
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
    const tools = pruneTools(parsed.tools);
    const input: Parameters<typeof db.agents.create>[1] = {
      slug: parsed.slug,
      name: parsed.name,
      systemPrompt: parsed.systemPrompt,
    };
    if (parsed.description) input.description = parsed.description;
    if (parsed.model) input.model = parsed.model;
    if (tools) input.tools = tools;
    if (parsed.skills) input.skills = parsed.skills;
    if (parsed.isActive !== undefined) input.isActive = parsed.isActive;

    const created = await db.agents.create(auth.ctx.tenantId, input);
    await db.recordActivity({
      tenantId: auth.ctx.tenantId,
      actor: auth.ctx.userId,
      action: 'created_agent',
      entity: created.name,
    });
    const body: ApiEnvelope<Agent> = { success: true, data: created, error: null };
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
