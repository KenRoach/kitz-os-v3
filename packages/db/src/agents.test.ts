import { describe, it, expect } from 'vitest';
import { createMemoryAgentsStore } from './agents';

const T = 't-1';
const OTHER = 't-2';

const seed = {
  slug: 'kitz',
  name: 'Kitz',
  systemPrompt: 'Asistente personal de KitZ. Responde con datos reales del espacio.',
};

describe('agents store', () => {
  it('first agent created in a tenant becomes active automatically', async () => {
    const store = createMemoryAgentsStore();
    const agent = await store.create(T, seed);
    expect(agent.is_active).toBe(true);
    expect(agent.model).toBe('haiku');
  });

  it('second agent without isActive=true does not steal active flag', async () => {
    const store = createMemoryAgentsStore();
    const first = await store.create(T, seed);
    const second = await store.create(T, { ...seed, slug: 'luna', name: 'Luna' });
    expect(first.is_active).toBe(true);
    expect(second.is_active).toBe(false);
  });

  it('explicitly creating with isActive=true demotes the previous active', async () => {
    const store = createMemoryAgentsStore();
    const first = await store.create(T, seed);
    await store.create(T, { ...seed, slug: 'luna', name: 'Luna', isActive: true });
    const refetched = await store.get(T, first.id);
    expect(refetched?.is_active).toBe(false);
  });

  it('rejects invalid slug', async () => {
    const store = createMemoryAgentsStore();
    await expect(store.create(T, { ...seed, slug: 'A' })).rejects.toThrow('invalid_slug');
    await expect(store.create(T, { ...seed, slug: '-bad' })).rejects.toThrow('invalid_slug');
  });

  it('rejects duplicate slug within a tenant', async () => {
    const store = createMemoryAgentsStore();
    await store.create(T, seed);
    await expect(store.create(T, seed)).rejects.toThrow('slug_taken');
  });

  it('isolates agents per tenant', async () => {
    const store = createMemoryAgentsStore();
    await store.create(T, seed);
    await store.create(OTHER, seed);
    expect((await store.list(T)).length).toBe(1);
    expect((await store.list(OTHER)).length).toBe(1);
    expect(await store.getBySlug(T, 'kitz')).not.toBeNull();
    expect(await store.getBySlug(OTHER, 'kitz')).not.toBeNull();
  });

  it('getActive returns the one active agent', async () => {
    const store = createMemoryAgentsStore();
    await store.create(T, seed);
    const second = await store.create(T, { ...seed, slug: 'luna', name: 'Luna' });
    await store.setActive(T, second.id);
    const active = await store.getActive(T);
    expect(active?.id).toBe(second.id);
  });

  it('setActive demotes the previous one', async () => {
    const store = createMemoryAgentsStore();
    const first = await store.create(T, seed);
    const second = await store.create(T, { ...seed, slug: 'luna', name: 'Luna' });
    await store.setActive(T, second.id);
    const refetched = await store.get(T, first.id);
    expect(refetched?.is_active).toBe(false);
  });

  it('update can flip model + tools', async () => {
    const store = createMemoryAgentsStore();
    const agent = await store.create(T, seed);
    const updated = await store.update(T, agent.id, {
      model: 'sonnet',
      tools: ['list_contacts', 'send_whatsapp'],
    });
    expect(updated?.model).toBe('sonnet');
    expect(updated?.tools).toEqual(['list_contacts', 'send_whatsapp']);
  });

  it('cannot deactivate the only active agent if it is the only one', async () => {
    const store = createMemoryAgentsStore();
    const agent = await store.create(T, seed);
    await expect(store.update(T, agent.id, { isActive: false })).rejects.toThrow(
      'last_active_agent',
    );
  });

  it('removing the active agent promotes the oldest remaining', async () => {
    const store = createMemoryAgentsStore();
    const first = await store.create(T, seed);
    const second = await store.create(T, { ...seed, slug: 'luna', name: 'Luna' });
    await store.remove(T, first.id);
    const refetched = await store.get(T, second.id);
    expect(refetched?.is_active).toBe(true);
  });

  it('returns null on update/get/remove of unknown id', async () => {
    const store = createMemoryAgentsStore();
    expect(await store.update(T, 'missing', { name: 'x' })).toBeNull();
    expect(await store.get(T, 'missing')).toBeNull();
    expect(await store.remove(T, 'missing')).toBe(false);
    expect(await store.setActive(T, 'missing')).toBeNull();
  });

  it('cannot cross-read across tenants', async () => {
    const store = createMemoryAgentsStore();
    const a = await store.create(T, seed);
    expect(await store.get(OTHER, a.id)).toBeNull();
    expect(await store.update(OTHER, a.id, { name: 'hack' })).toBeNull();
    expect(await store.remove(OTHER, a.id)).toBe(false);
  });
});
