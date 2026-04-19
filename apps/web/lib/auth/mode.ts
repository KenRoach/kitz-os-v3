/**
 * Sandbox vs Live mode resolution.
 *
 * Every signup creates two tenants for the user: a `live` tenant and a
 * paired `${slug}-sandbox` tenant seeded with demo data. The active mode
 * is stored in a `kitz_mode` cookie. Defaults to `sandbox` so new users
 * land in the demo experience automatically.
 */

import type { DbClient, Tenant, WorkspaceMember } from '@kitz/db';

export const WORKSPACE_MODE_COOKIE = 'kitz_mode';

export type WorkspaceMode = 'sandbox' | 'live';

export function isWorkspaceMode(value: unknown): value is WorkspaceMode {
  return value === 'sandbox' || value === 'live';
}

/**
 * Resolve which tenant the user should see for a given mode.
 *
 * Returns null if the user has no matching tenant — caller should redirect
 * to onboarding (no tenants at all) or fall back to the live tenant.
 */
export async function resolveTenantForMode(
  db: DbClient,
  userId: string,
  mode: WorkspaceMode,
): Promise<{ tenant: Tenant; membership: WorkspaceMember } | null> {
  const tenants = await db.listTenantsForUser(userId);
  if (tenants.length === 0) return null;

  const wantSandbox = mode === 'sandbox';
  const match = tenants.find((t) => t.tenant.slug.endsWith('-sandbox') === wantSandbox);
  if (match) return match;

  // Legacy users (created before sandbox seeding) only have one tenant —
  // fall back to whatever exists rather than redirecting them out.
  return tenants[0] ?? null;
}
