import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import type { ApiEnvelope } from '@kitz/types';
import { WORK_PACK_SLUGS } from '@kitz/agents/work-packs';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME, resolveSession } from '@/lib/auth/session';
import { createWorkspaceForUser } from '@/lib/onboarding/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  workspaceName: z.string().min(2).max(120),
  fullName: z.string().min(2).max(120),
  preferredSlug: z.string().max(64).optional(),
  workPack: z.enum(WORK_PACK_SLUGS as [string, ...string[]]).optional(),
});

export async function POST(request: Request): Promise<Response> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const db = getDb();
  const session = await resolveSession(db, token);
  if (!session) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'unauthenticated' };
    return NextResponse.json(body, { status: 401 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'invalid_body' };
    return NextResponse.json(body, { status: 400 });
  }

  const existing = await db.findPrimaryTenant(session.user_id);
  if (existing) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'already_onboarded' };
    return NextResponse.json(body, { status: 409 });
  }

  const result = await createWorkspaceForUser(db, {
    userId: session.user_id,
    workspaceName: parsed.workspaceName,
    fullName: parsed.fullName,
    ...(parsed.preferredSlug ? { preferredSlug: parsed.preferredSlug } : {}),
    ...(parsed.workPack ? { workPack: parsed.workPack as never } : {}),
  });

  if (!result.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: result.reason };
    return NextResponse.json(body, { status: 400 });
  }

  const body: ApiEnvelope<{ tenantId: string; slug: string }> = {
    success: true,
    data: { tenantId: result.tenant.id, slug: result.tenant.slug },
    error: null,
  };
  return NextResponse.json(body, { status: 200 });
}
