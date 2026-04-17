import { describe, it, expect } from 'vitest';
import { createStubDb } from '@kitz/db/stub';
import { createWorkspaceForUser, resolveUniqueSlug } from './service';

async function seedUser(db: ReturnType<typeof createStubDb>, email: string) {
  return db.createUser({ email });
}

describe('resolveUniqueSlug', () => {
  it('returns the desired slug when free', async () => {
    const db = createStubDb();
    expect(await resolveUniqueSlug(db, 'acme')).toBe('acme');
  });

  it('returns null when desired slug is invalid', async () => {
    const db = createStubDb();
    expect(await resolveUniqueSlug(db, 'a')).toBeNull();
    expect(await resolveUniqueSlug(db, '-bad')).toBeNull();
  });

  it('suffixes when slug is taken', async () => {
    const db = createStubDb();
    const user = await seedUser(db, 'a@x.com');
    await db.createTenantWithOwner({ slug: 'acme', name: 'Acme', ownerUserId: user.id });
    expect(await resolveUniqueSlug(db, 'acme')).toBe('acme-2');
  });

  it('keeps suffixing past the first collision', async () => {
    const db = createStubDb();
    const user1 = await seedUser(db, '1@x.com');
    const user2 = await seedUser(db, '2@x.com');
    await db.createTenantWithOwner({ slug: 'acme', name: 'Acme', ownerUserId: user1.id });
    await db.createTenantWithOwner({ slug: 'acme-2', name: 'Acme2', ownerUserId: user2.id });
    expect(await resolveUniqueSlug(db, 'acme')).toBe('acme-3');
  });
});

describe('createWorkspaceForUser', () => {
  it('creates tenant + owner membership from a workspace name', async () => {
    const db = createStubDb();
    const user = await seedUser(db, 'ken@example.com');
    const result = await createWorkspaceForUser(db, {
      userId: user.id,
      workspaceName: 'Acme Corp',
      fullName: 'Ken Roach',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tenant.slug).toBe('acme-corp');
      expect(result.tenant.name).toBe('Acme Corp');
      expect(result.membership.role).toBe('owner');
      expect(result.membership.user_id).toBe(user.id);
    }
    const profile = await db.findUserByEmail('ken@example.com');
    expect(profile?.full_name).toBe('Ken Roach');
  });

  it('uses preferredSlug when provided', async () => {
    const db = createStubDb();
    const user = await seedUser(db, 'ken@example.com');
    const result = await createWorkspaceForUser(db, {
      userId: user.id,
      workspaceName: 'Acme Corp',
      fullName: 'Ken',
      preferredSlug: 'kitz-internal',
    });
    expect(result.ok && result.tenant.slug).toBe('kitz-internal');
  });

  it('suffixes slug on collision', async () => {
    const db = createStubDb();
    const u1 = await seedUser(db, 'a@x.com');
    const u2 = await seedUser(db, 'b@x.com');
    await createWorkspaceForUser(db, { userId: u1.id, workspaceName: 'Acme', fullName: 'A A' });
    const r2 = await createWorkspaceForUser(db, {
      userId: u2.id,
      workspaceName: 'Acme',
      fullName: 'B B',
    });
    expect(r2.ok && r2.tenant.slug).toBe('acme-2');
  });

  it('rejects name that is too short', async () => {
    const db = createStubDb();
    const user = await seedUser(db, 'x@x.com');
    const result = await createWorkspaceForUser(db, {
      userId: user.id,
      workspaceName: 'A',
      fullName: 'X',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_name');
  });

  it('rejects unusable workspace name that slugifies empty', async () => {
    const db = createStubDb();
    const user = await seedUser(db, 'x@x.com');
    const result = await createWorkspaceForUser(db, {
      userId: user.id,
      workspaceName: '!!!',
      fullName: 'Real Name',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_slug');
  });
});
