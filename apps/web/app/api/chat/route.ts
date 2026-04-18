import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { signServiceJwt } from '@kitz/config/jwt';
import type { ApiEnvelope } from '@kitz/types';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME, resolveSession } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'kitz']),
        text: z.string().max(8000),
      }),
    )
    .max(50)
    .optional(),
});

async function requireTenantId(): Promise<
  { ok: true; userId: string; tenantId: string } | { ok: false; status: number; error: string }
> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const db = getDb();
  const session = await resolveSession(db, token);
  if (!session) return { ok: false, status: 401, error: 'unauthenticated' };
  const primary = await db.findPrimaryTenant(session.user_id);
  if (!primary) return { ok: false, status: 409, error: 'no_tenant' };
  return { ok: true, userId: session.user_id, tenantId: primary.tenant.id };
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireTenantId();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'invalid_body' };
    return NextResponse.json(body, { status: 400 });
  }

  const secret = process.env.SERVICE_JWT_SECRET;
  const runtimeUrl = process.env.OS_RUNTIME_URL ?? 'http://localhost:5200';
  if (!secret) {
    const body: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: 'service_jwt_secret_not_configured',
    };
    return NextResponse.json(body, { status: 500 });
  }

  try {
    const token = await signServiceJwt(auth.tenantId, secret);
    const db = getDb();
    const activeAgent = await db.agents.getActive(auth.tenantId);
    const upstreamBody = activeAgent
      ? {
          ...parsed,
          agent: {
            slug: activeAgent.slug,
            name: activeAgent.name,
            systemPrompt: activeAgent.system_prompt,
            model: activeAgent.model,
            tools: activeAgent.tools,
          },
        }
      : parsed;

    const upstream = await fetch(`${runtimeUrl}/chat`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(upstreamBody),
      cache: 'no-store',
    });

    const upstreamJson = (await upstream.json()) as unknown;

    if (upstream.ok) {
      const db = getDb();
      await db.recordActivity({
        tenantId: auth.tenantId,
        actor: auth.userId,
        action: 'sent_message',
        entity: 'kitz-chat',
      });
    }

    return NextResponse.json(upstreamJson, { status: upstream.status });
  } catch (err) {
    const body: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: err instanceof Error ? err.message : 'ai_runtime_unreachable',
    };
    return NextResponse.json(body, { status: 502 });
  }
}
