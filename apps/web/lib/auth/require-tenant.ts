import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME, resolveSession } from '@/lib/auth/session';
import {
  WORKSPACE_MODE_COOKIE,
  isWorkspaceMode,
  resolveTenantForMode,
  type WorkspaceMode,
} from '@/lib/auth/mode';

export type TenantContext = {
  userId: string;
  email: string;
  tenantId: string;
  slug: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  mode: WorkspaceMode;
};

export type RequireTenantResult =
  | { ok: true; ctx: TenantContext }
  | { ok: false; status: number; error: string };

/**
 * Resolve the active session + tenant for the active workspace mode.
 *
 * Mode is read from the `kitz_mode` cookie (defaults to `sandbox`).
 * Returns a typed failure envelope so callers short-circuit cleanly.
 */
export async function requireTenant(): Promise<RequireTenantResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const db = getDb();
  const session = await resolveSession(db, token);
  if (!session) return { ok: false, status: 401, error: 'unauthenticated' };

  const rawMode = cookieStore.get(WORKSPACE_MODE_COOKIE)?.value;
  const mode: WorkspaceMode = isWorkspaceMode(rawMode) ? rawMode : 'sandbox';

  const resolved = await resolveTenantForMode(db, session.user_id, mode);
  if (!resolved) return { ok: false, status: 409, error: 'no_tenant' };

  return {
    ok: true,
    ctx: {
      userId: session.user_id,
      email: session.email,
      tenantId: resolved.tenant.id,
      slug: resolved.tenant.slug,
      role: resolved.membership.role,
      mode,
    },
  };
}
