import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import type { ApiEnvelope } from '@kitz/types';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME, resolveSession } from '@/lib/auth/session';
import {
  WORKSPACE_MODE_COOKIE,
  isWorkspaceMode,
  resolveTenantForMode,
  type WorkspaceMode,
} from '@/lib/auth/mode';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const switchSchema = z.object({
  mode: z.enum(['sandbox', 'live']),
});

type ModePayload = {
  mode: WorkspaceMode;
  hasSandbox: boolean;
  hasLive: boolean;
  activeSlug: string | null;
};

async function buildPayload(): Promise<{ status: number; body: ApiEnvelope<ModePayload | null> }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const db = getDb();
  const session = await resolveSession(db, token);
  if (!session) {
    return { status: 401, body: { success: false, data: null, error: 'unauthenticated' } };
  }
  const tenants = await db.listTenantsForUser(session.user_id);
  const hasSandbox = tenants.some((t) => t.tenant.slug.endsWith('-sandbox'));
  const hasLive = tenants.some((t) => !t.tenant.slug.endsWith('-sandbox'));
  const raw = cookieStore.get(WORKSPACE_MODE_COOKIE)?.value;
  const mode: WorkspaceMode = isWorkspaceMode(raw) ? raw : 'sandbox';
  const resolved = await resolveTenantForMode(db, session.user_id, mode);
  return {
    status: 200,
    body: {
      success: true,
      data: {
        mode,
        hasSandbox,
        hasLive,
        activeSlug: resolved?.tenant.slug ?? null,
      },
      error: null,
    },
  };
}

export async function GET(): Promise<Response> {
  const { status, body } = await buildPayload();
  return NextResponse.json(body, { status });
}

export async function POST(request: Request): Promise<Response> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const db = getDb();
  const session = await resolveSession(db, token);
  if (!session) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'unauthenticated' };
    return NextResponse.json(body, { status: 401 });
  }

  let parsed: z.infer<typeof switchSchema>;
  try {
    parsed = switchSchema.parse(await request.json());
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'invalid_body' };
    return NextResponse.json(body, { status: 400 });
  }

  const target = await resolveTenantForMode(db, session.user_id, parsed.mode);
  if (!target) {
    // The user doesn't have a tenant for the requested mode (e.g. legacy
    // accounts created before the sandbox split). Refuse instead of silently
    // putting them somewhere unexpected.
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'no_tenant_for_mode' };
    return NextResponse.json(body, { status: 409 });
  }

  cookieStore.set(WORKSPACE_MODE_COOKIE, parsed.mode, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    // 30 days — mode is a UI preference, not a security boundary
    maxAge: 60 * 60 * 24 * 30,
  });

  await db.recordActivity({
    tenantId: target.tenant.id,
    actor: session.user_id,
    action: 'switched_mode',
    entity: parsed.mode,
  });

  const body: ApiEnvelope<{ mode: WorkspaceMode; activeSlug: string }> = {
    success: true,
    data: { mode: parsed.mode, activeSlug: target.tenant.slug },
    error: null,
  };
  return NextResponse.json(body, { status: 200 });
}
