import type { DbClient } from '@kitz/db';
import type { Tenant, WorkspaceMember } from '@kitz/db/types';
import { getWorkPack, type WorkPackSlug } from '@kitz/agents/work-packs';
import { isValidSlug, slugify, suffixSlug } from './slug';

export type CreateWorkspaceInput = {
  userId: string;
  workspaceName: string;
  fullName: string;
  /** Optional explicit slug. If absent, derived from workspaceName. */
  preferredSlug?: string;
  /** Work-pack slug. Falls back to 'general' if missing or unknown. */
  workPack?: WorkPackSlug;
};

export type CreateWorkspaceResult =
  | { ok: true; tenant: Tenant; membership: WorkspaceMember; agentsSeeded: number }
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
 * Seed the chosen work-pack's agents into a freshly-created tenant. The
 * first agent in the pack becomes the active one. Tolerant of partial
 * failures: returns the count actually created.
 */
async function seedPackAgents(
  db: DbClient,
  tenantId: string,
  packSlug: WorkPackSlug,
): Promise<number> {
  const pack = getWorkPack(packSlug) ?? getWorkPack('general');
  if (!pack) return 0;

  let created = 0;
  let firstSeeded = true;
  for (const seed of pack.agents) {
    try {
      await db.agents.create(tenantId, {
        slug: seed.slug,
        name: seed.name,
        description: seed.description,
        systemPrompt: seed.systemPrompt,
        model: seed.defaultModel,
        tools: [...seed.defaultTools],
        // The store auto-activates the first agent in an empty tenant; pass
        // explicit isActive=true on the first to be explicit + future-proof.
        isActive: firstSeeded,
      });
      created += 1;
      firstSeeded = false;
    } catch {
      // Don't block onboarding on a single seed failure (e.g. slug collision
      // because the same pack was seeded twice in dev).
    }
  }
  return created;
}

/**
 * Create a workspace for a user: sets profile name, creates tenant + owner
 * membership, then seeds the chosen work-pack's agents.
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

  const packSlug: WorkPackSlug = input.workPack ?? 'general';
  const agentsSeeded = await seedPackAgents(db, tenant.id, packSlug);

  // Record the pack choice as an activity event so the dashboard log shows
  // why the agents appeared.
  if (agentsSeeded > 0) {
    await db.recordActivity({
      tenantId: tenant.id,
      actor: input.userId,
      action: 'seeded_workpack',
      entity: packSlug,
    });
  }

  return { ok: true, tenant, membership, agentsSeeded };
}
