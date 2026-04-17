import { describe, it, expect } from 'vitest';
import { createStubDb } from './stub';

describe('tenant stats + activity', () => {
  it('returns zero stats before any tenant is created', async () => {
    const db = createStubDb();
    const stats = await db.getTenantStats('unknown');
    expect(stats.contacts).toBe(0);
    expect(stats.credits.balance).toBe(0);
  });

  it('seeds default credits on createTenantWithOwner', async () => {
    const db = createStubDb();
    const user = await db.createUser({ email: 'u@x.com' });
    const { tenant } = await db.createTenantWithOwner({
      slug: 'acme',
      name: 'Acme',
      ownerUserId: user.id,
    });
    const stats = await db.getTenantStats(tenant.id);
    expect(stats.credits.balance).toBe(100);
    expect(stats.credits.lifetimeTopup).toBe(100);
  });

  it('records tenant creation as the first activity event', async () => {
    const db = createStubDb();
    const user = await db.createUser({ email: 'u@x.com' });
    const { tenant } = await db.createTenantWithOwner({
      slug: 'acme',
      name: 'Acme',
      ownerUserId: user.id,
    });
    const activity = await db.listRecentActivity(tenant.id);
    expect(activity).toHaveLength(1);
    expect(activity[0]?.action).toBe('created_workspace');
    expect(activity[0]?.entity).toBe('acme');
  });

  it('recordActivity prepends and respects limit', async () => {
    const db = createStubDb();
    const user = await db.createUser({ email: 'u@x.com' });
    const { tenant } = await db.createTenantWithOwner({
      slug: 'acme',
      name: 'Acme',
      ownerUserId: user.id,
    });
    for (let i = 0; i < 5; i++) {
      await db.recordActivity({
        tenantId: tenant.id,
        actor: user.id,
        action: 'test',
        entity: `e-${i}`,
      });
    }
    const three = await db.listRecentActivity(tenant.id, 3);
    expect(three).toHaveLength(3);
    expect(three[0]?.entity).toBe('e-4');
  });

  it('activity is scoped to tenant', async () => {
    const db = createStubDb();
    const u1 = await db.createUser({ email: 'a@x.com' });
    const u2 = await db.createUser({ email: 'b@x.com' });
    const { tenant: t1 } = await db.createTenantWithOwner({
      slug: 'acme',
      name: 'Acme',
      ownerUserId: u1.id,
    });
    const { tenant: t2 } = await db.createTenantWithOwner({
      slug: 'beta',
      name: 'Beta',
      ownerUserId: u2.id,
    });
    expect((await db.listRecentActivity(t1.id)).every((a) => a.tenant_id === t1.id)).toBe(true);
    expect((await db.listRecentActivity(t2.id)).every((a) => a.tenant_id === t2.id)).toBe(true);
  });
});
