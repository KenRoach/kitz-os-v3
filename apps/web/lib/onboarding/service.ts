import type { DbClient } from '@kitz/db';
import type { Tenant, WorkspaceMember } from '@kitz/db/types';
import { isValidSlug, slugify, suffixSlug } from './slug';

export type CreateWorkspaceInput = {
  userId: string;
  workspaceName: string;
  fullName: string;
  /** Optional explicit slug. If absent, derived from workspaceName. */
  preferredSlug?: string;
};

export type CreateWorkspaceResult =
  | { ok: true; tenant: Tenant; membership: WorkspaceMember }
  | { ok: false; reason: 'invalid_name' | 'invalid_slug' | 'slug_exhausted' };

const MAX_SLUG_ATTEMPTS = 20;

/**
 * Resolve a unique, valid slug by appending numeric suffixes until free.
 */
export async function resolveUniqueSlug(db: DbClient, desired: string): Promise<string | null> {
  if (!isValidSlug(desired)) return null;
  const existing = await db.findTenantBySlug(desired);
  if (!existing) return desired;

  for (let n = 2; n <= MAX_SLUG_ATTEMPTS; n++) {
    const candidate = suffixSlug(desired, n);
    if (!isValidSlug(candidate)) continue;
    const taken = await db.findTenantBySlug(candidate);
    if (!taken) return candidate;
  }
  return null;
}

/**
 * Create a workspace for a user: sets profile name, creates tenant + owner
 * membership. Idempotent only in the sense that a second call with the same
 * userId will succeed only if the slug is not taken (we intentionally do not
 * auto-join existing workspaces here).
 */
export async function createWorkspaceForUser(
  db: DbClient,
  input: CreateWorkspaceInput,
): Promise<CreateWorkspaceResult> {
  const name = input.workspaceName.trim();
  const fullName = input.fullName.trim();
  if (name.length < 2 || name.length > 120) return { ok: false, reason: 'invalid_name' };
  if (fullName.length < 2 || fullName.length > 120) return { ok: false, reason: 'invalid_name' };

  const desired =
    input.preferredSlug && input.preferredSlug.length > 0
      ? slugify(input.preferredSlug)
      : slugify(name);

  if (!isValidSlug(desired)) return { ok: false, reason: 'invalid_slug' };

  const uniqueSlug = await resolveUniqueSlug(db, desired);
  if (!uniqueSlug) return { ok: false, reason: 'slug_exhausted' };

  await db.updateUserProfile(input.userId, { full_name: fullName });

  const { tenant, membership } = await db.createTenantWithOwner({
    slug: uniqueSlug,
    name,
    ownerUserId: input.userId,
  });

  return { ok: true, tenant, membership };
}
