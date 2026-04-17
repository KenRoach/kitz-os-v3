import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME, resolveSession } from '@/lib/auth/session';

export type TenantContext = {
  userId: string;
  email: string;
  tenantId: string;
  slug: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
};

export type RequireTenantResult =
  | { ok: true; ctx: TenantContext }
  | { ok: false; status: number; error: string };

/**
 * Resolve the active session + primary tenant for an API route.
 *
 * Returns a typed failure envelope instead of throwing so callers can
 * short-circuit with a NextResponse easily.
 */
export async function requireTenant(): Promise<RequireTenantResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const db = getDb();
  const session = await resolveSession(db, token);
  if (!session) return { ok: false, status: 401, error: 'unauthenticated' };
  const primary = await db.findPrimaryTenant(session.user_id);
  if (!primary) return { ok: false, status: 409, error: 'no_tenant' };
  return {
    ok: true,
    ctx: {
      userId: session.user_id,
      email: session.email,
      tenantId: primary.tenant.id,
      slug: primary.tenant.slug,
      role: primary.membership.role,
    },
  };
}
