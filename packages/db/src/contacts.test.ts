import { describe, it, expect } from 'vitest';
import { createMemoryContactsStore } from './contacts';

const TENANT = 't-1';
const OTHER = 't-2';

describe('contacts store', () => {
  it('creates and lists a contact', async () => {
    const store = createMemoryContactsStore();
    const c = await store.create(TENANT, { name: 'Ken Roach', email: 'ken@x.com' });
    expect(c.id).toBeDefined();
    expect(c.tenant_id).toBe(TENANT);
    const page = await store.list(TENANT);
    expect(page.total).toBe(1);
    expect(page.items[0]?.email).toBe('ken@x.com');
  });

  it('trims whitespace on create', async () => {
    const store = createMemoryContactsStore();
    const c = await store.create(TENANT, {
      name: '  Ken  ',
      email: ' ken@x.com ',
      phone: ' +507 1234 ',
      company: ' Acme ',
      tags: ['  vip ', '', 'cliente  '],
    });
    expect(c.name).toBe('Ken');
    expect(c.email).toBe('ken@x.com');
    expect(c.phone).toBe('+507 1234');
    expect(c.tags).toEqual(['vip', 'cliente']);
  });

  it('rejects empty name', async () => {
    const store = createMemoryContactsStore();
    await expect(store.create(TENANT, { name: '   ' })).rejects.toThrow('invalid_name');
  });

  it('isolates contacts per tenant', async () => {
    const store = createMemoryContactsStore();
    await store.create(TENANT, { name: 'A' });
    await store.create(OTHER, { name: 'B' });
    const t1 = await store.list(TENANT);
    const t2 = await store.list(OTHER);
    expect(t1.total).toBe(1);
    expect(t2.total).toBe(1);
    expect(t1.items[0]?.name).toBe('A');
    expect(t2.items[0]?.name).toBe('B');
  });

  it('search matches across name, email, phone, company, tags', async () => {
    const store = createMemoryContactsStore();
    await store.create(TENANT, { name: 'Ken Roach', email: 'ken@acme.com' });
    await store.create(TENANT, { name: 'Jane', company: 'Acme' });
    await store.create(TENANT, { name: 'Bob', tags: ['vip'] });
    expect((await store.list(TENANT, { query: 'acme' })).total).toBe(2);
    expect((await store.list(TENANT, { query: 'vip' })).total).toBe(1);
    expect((await store.list(TENANT, { query: 'ken' })).total).toBe(1);
    expect((await store.list(TENANT, { query: 'xyz' })).total).toBe(0);
  });

  it('search is case-insensitive', async () => {
    const store = createMemoryContactsStore();
    await store.create(TENANT, { name: 'Ken', email: 'KEN@ACME.com' });
    expect((await store.list(TENANT, { query: 'acme' })).total).toBe(1);
    expect((await store.list(TENANT, { query: 'KEN' })).total).toBe(1);
  });

  it('respects limit and offset', async () => {
    const store = createMemoryContactsStore();
    for (let i = 0; i < 5; i++) {
      await store.create(TENANT, { name: `C${i}` });
    }
    const page1 = await store.list(TENANT, { limit: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page1.total).toBe(5);
    const page2 = await store.list(TENANT, { limit: 2, offset: 2 });
    expect(page2.items).toHaveLength(2);
  });

  it('updates a contact partially', async () => {
    const store = createMemoryContactsStore();
    const c = await store.create(TENANT, { name: 'Ken', email: 'a@x.com' });
    const updated = await store.update(TENANT, c.id, { notes: 'VIP cliente' });
    expect(updated?.notes).toBe('VIP cliente');
    expect(updated?.email).toBe('a@x.com');
    // updated_at is an ISO timestamp >= created_at
    expect((updated?.updated_at ?? '') >= c.created_at).toBe(true);
  });

  it('returns null on update/get/remove of unknown id', async () => {
    const store = createMemoryContactsStore();
    expect(await store.update(TENANT, 'missing', { name: 'x' })).toBeNull();
    expect(await store.get(TENANT, 'missing')).toBeNull();
    expect(await store.remove(TENANT, 'missing')).toBe(false);
  });

  it('removes a contact', async () => {
    const store = createMemoryContactsStore();
    const c = await store.create(TENANT, { name: 'Ken' });
    expect(await store.remove(TENANT, c.id)).toBe(true);
    expect(await store.get(TENANT, c.id)).toBeNull();
    expect(await store.count(TENANT)).toBe(0);
  });

  it('cannot cross-read across tenants', async () => {
    const store = createMemoryContactsStore();
    const c = await store.create(TENANT, { name: 'Ken' });
    expect(await store.get(OTHER, c.id)).toBeNull();
    expect(await store.update(OTHER, c.id, { notes: 'hack' })).toBeNull();
    expect(await store.remove(OTHER, c.id)).toBe(false);
  });
});
