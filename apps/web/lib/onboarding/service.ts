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
  | {
      ok: true;
      tenant: Tenant;
      membership: WorkspaceMember;
      sandboxTenant: Tenant;
      sandboxMembership: WorkspaceMember;
      agentsSeeded: number;
    }
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

  // Live tenant.
  const { tenant, membership } = await db.createTenantWithOwner({
    slug: uniqueSlug,
    name,
    ownerUserId: input.userId,
  });

  // Sandbox tenant — every workspace gets a paired sandbox so users can
  // explore the product on demo data without polluting their real account.
  // The sandbox slug is suffixed `-sandbox`; if that's taken (vanishingly
  // rare since it shares a base with the live slug) we walk numerically.
  const sandboxBase = `${uniqueSlug}-sandbox`;
  const sandboxSlug = (await resolveUniqueSlug(db, sandboxBase)) ?? sandboxBase;
  const { tenant: sandboxTenant, membership: sandboxMembership } = await db.createTenantWithOwner({
    slug: sandboxSlug,
    name: `${name} (sandbox)`,
    ownerUserId: input.userId,
  });

  const packSlug: WorkPackSlug = input.workPack ?? 'general';
  // Seed the live tenant with the chosen pack's agents.
  const agentsSeeded = await seedPackAgents(db, tenant.id, packSlug);
  // Seed the sandbox with the same agents AND demo CRM data so the user
  // sees a "lived-in" workspace immediately on first login.
  await seedPackAgents(db, sandboxTenant.id, packSlug);
  await seedSandboxDemoData(db, sandboxTenant.id, input.userId);

  if (agentsSeeded > 0) {
    await db.recordActivity({
      tenantId: tenant.id,
      actor: input.userId,
      action: 'seeded_workpack',
      entity: packSlug,
    });
  }

  return {
    ok: true,
    tenant,
    membership,
    sandboxTenant,
    sandboxMembership,
    agentsSeeded,
  };
}

/**
 * Drop a small set of fake contacts / deals / events into a freshly-created
 * sandbox tenant so the new user has something to click around on.
 */
async function seedSandboxDemoData(
  db: DbClient,
  tenantId: string,
  userId: string,
): Promise<void> {
  const demoContacts = [
    { name: 'Jaime Madrid', email: 'jaime@prowall.pa', company: 'ProWall Panamá', tags: ['prospect'] },
    { name: 'Lital Ben-Zeev', email: 'lital@wgl.legal', company: 'WGL Legal', tags: ['partner'] },
    { name: 'Edilberto García', email: 'edi@codeaudit.io', company: 'Code Audit', tags: ['vendor'] },
  ];
  for (const c of demoContacts) {
    try {
      await db.contacts.create(tenantId, {
        name: c.name,
        email: c.email,
        company: c.company,
        tags: c.tags,
      });
    } catch {
      /* tolerate seed failures */
    }
  }
  try {
    await db.recordActivity({
      tenantId,
      actor: userId,
      action: 'seeded_sandbox',
      entity: 'demo',
    });
  } catch {
    /* noop */
  }
}
