import { describe, it, expect } from 'vitest';
import { createMemorySkillsStore } from './skills';

const T = 't-1';
const OTHER = 't-2';

const baseInput = {
  slug: 'lookup-customer',
  name: 'Buscar cliente',
  kind: 'mcp_file' as const,
  source: 'mcp://kitz/customer-lookup',
};

describe('skills store', () => {
  it('creates a skill with defaults applied', async () => {
    const store = createMemorySkillsStore();
    const s = await store.create(T, baseInput);
    expect(s.slug).toBe('lookup-customer');
    expect(s.kind).toBe('mcp_file');
    expect(s.metadata).toEqual({});
    expect(s.description).toBeNull();
  });

  it('lowercases the slug + trims fields', async () => {
    const store = createMemorySkillsStore();
    const s = await store.create(T, {
      ...baseInput,
      slug: 'LOOKUP-Customer',
      name: '  Buscar cliente  ',
      source: '  mcp://kitz/customer-lookup  ',
      description: '  hace lookup  ',
    });
    expect(s.slug).toBe('lookup-customer');
    expect(s.name).toBe('Buscar cliente');
    expect(s.source).toBe('mcp://kitz/customer-lookup');
    expect(s.description).toBe('hace lookup');
  });

  it('rejects invalid slug', async () => {
    const store = createMemorySkillsStore();
    await expect(store.create(T, { ...baseInput, slug: 'A' })).rejects.toThrow('invalid_slug');
    await expect(store.create(T, { ...baseInput, slug: '-bad' })).rejects.toThrow('invalid_slug');
  });

  it('rejects empty source', async () => {
    const store = createMemorySkillsStore();
    await expect(store.create(T, { ...baseInput, source: '   ' })).rejects.toThrow(
      'invalid_source',
    );
  });

  it('webhook kind requires http(s) URL', async () => {
    const store = createMemorySkillsStore();
    await expect(
      store.create(T, { ...baseInput, slug: 'wh', kind: 'webhook', source: 'not-a-url' }),
    ).rejects.toThrow('invalid_source');
    const ok = await store.create(T, {
      ...baseInput,
      slug: 'wh-ok',
      kind: 'webhook',
      source: 'https://example.com/hook',
    });
    expect(ok.kind).toBe('webhook');
  });

  it('mcp_file kind accepts non-URL strings', async () => {
    const store = createMemorySkillsStore();
    const s = await store.create(T, { ...baseInput, slug: 'mcp', source: 'mcp://x/y' });
    expect(s.source).toBe('mcp://x/y');
  });

  it('rejects duplicate slug per tenant', async () => {
    const store = createMemorySkillsStore();
    await store.create(T, baseInput);
    await expect(store.create(T, baseInput)).rejects.toThrow('slug_taken');
  });

  it('isolates skills per tenant (same slug allowed across tenants)', async () => {
    const store = createMemorySkillsStore();
    await store.create(T, baseInput);
    const other = await store.create(OTHER, baseInput);
    expect(other.tenant_id).toBe(OTHER);
    expect((await store.list(T)).length).toBe(1);
    expect((await store.list(OTHER)).length).toBe(1);
    expect(await store.getBySlug(T, 'lookup-customer')).not.toBeNull();
    expect(await store.getBySlug(OTHER, 'lookup-customer')).not.toBeNull();
    expect(await store.get(OTHER, (await store.list(T))[0]!.id)).toBeNull();
  });

  it('updates name + description + metadata', async () => {
    const store = createMemorySkillsStore();
    const s = await store.create(T, baseInput);
    const updated = await store.update(T, s.id, {
      name: 'Otro nombre',
      description: null,
      metadata: { provider: 'kitz', timeoutMs: 5000 },
    });
    expect(updated?.name).toBe('Otro nombre');
    expect(updated?.description).toBeNull();
    expect(updated?.metadata).toEqual({ provider: 'kitz', timeoutMs: 5000 });
  });

  it('update validates source against the (possibly new) kind', async () => {
    const store = createMemorySkillsStore();
    const s = await store.create(T, baseInput);
    await expect(store.update(T, s.id, { kind: 'webhook', source: 'not-a-url' })).rejects.toThrow(
      'invalid_source',
    );
  });

  it('returns null on update/get/remove of unknown id', async () => {
    const store = createMemorySkillsStore();
    expect(await store.update(T, 'missing', { name: 'x' })).toBeNull();
    expect(await store.get(T, 'missing')).toBeNull();
    expect(await store.remove(T, 'missing')).toBe(false);
  });

  it('cannot cross-mutate across tenants', async () => {
    const store = createMemorySkillsStore();
    const s = await store.create(T, baseInput);
    expect(await store.update(OTHER, s.id, { name: 'hack' })).toBeNull();
    expect(await store.remove(OTHER, s.id)).toBe(false);
  });

  it('count + list reflect inserts', async () => {
    const store = createMemorySkillsStore();
    expect(await store.count(T)).toBe(0);
    await store.create(T, baseInput);
    await store.create(T, { ...baseInput, slug: 'sk-b', name: 'B' });
    await store.create(T, { ...baseInput, slug: 'sk-c', name: 'C' });
    expect(await store.count(T)).toBe(3);
    expect((await store.list(T)).map((s) => s.slug)).toEqual(['lookup-customer', 'sk-b', 'sk-c']);
  });
});
