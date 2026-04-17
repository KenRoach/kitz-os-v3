import { describe, it, expect } from 'vitest';
import { createMemoryDealsStore } from './deals';

const T = 't-1';

describe('deals store', () => {
  it('creates with defaults: prospecto stage, 20% probability, USD currency, 0 amount', async () => {
    const store = createMemoryDealsStore();
    const d = await store.create(T, { title: 'Acme Q1' });
    expect(d.stage).toBe('prospecto');
    expect(d.probability).toBe(20);
    expect(d.currency).toBe('USD');
    expect(d.amount).toBe(0);
    expect(d.closed_at).toBeNull();
  });

  it('sets closed_at when created at ganado/perdido stage', async () => {
    const store = createMemoryDealsStore();
    const won = await store.create(T, { title: 'Won', stage: 'ganado' });
    const lost = await store.create(T, { title: 'Lost', stage: 'perdido' });
    expect(won.closed_at).not.toBeNull();
    expect(lost.closed_at).not.toBeNull();
    expect(won.probability).toBe(100);
    expect(lost.probability).toBe(0);
  });

  it('rejects invalid title and amount', async () => {
    const store = createMemoryDealsStore();
    await expect(store.create(T, { title: '' })).rejects.toThrow('invalid_title');
    await expect(store.create(T, { title: 'ok', amount: -1 })).rejects.toThrow('invalid_amount');
    await expect(store.create(T, { title: 'ok', probability: 200 })).rejects.toThrow(
      'invalid_probability',
    );
  });

  it('uppercases currency', async () => {
    const store = createMemoryDealsStore();
    const d = await store.create(T, { title: 'x', currency: 'pab' });
    expect(d.currency).toBe('PAB');
  });

  it('filters by stage', async () => {
    const store = createMemoryDealsStore();
    await store.create(T, { title: 'A' });
    await store.create(T, { title: 'B', stage: 'propuesta' });
    const props = await store.list(T, { stage: 'propuesta' });
    expect(props).toHaveLength(1);
    expect(props[0]?.title).toBe('B');
  });

  it('update sets closed_at when stage transitions to ganado', async () => {
    const store = createMemoryDealsStore();
    const d = await store.create(T, { title: 'x' });
    expect(d.closed_at).toBeNull();
    const won = await store.update(T, d.id, { stage: 'ganado' });
    expect(won?.closed_at).not.toBeNull();
  });

  it('update clears closed_at if stage goes back to open', async () => {
    const store = createMemoryDealsStore();
    const d = await store.create(T, { title: 'x', stage: 'ganado' });
    expect(d.closed_at).not.toBeNull();
    const reopened = await store.update(T, d.id, { stage: 'negociacion' });
    expect(reopened?.closed_at).toBeNull();
  });

  it('isolates across tenants', async () => {
    const store = createMemoryDealsStore();
    await store.create(T, { title: 'A' });
    await store.create('other', { title: 'B' });
    expect((await store.list(T)).length).toBe(1);
    expect((await store.list('other')).length).toBe(1);
  });

  it('summary aggregates by stage and pipeline value excludes closed', async () => {
    const store = createMemoryDealsStore();
    await store.create(T, { title: 'p1', amount: 100, stage: 'prospecto' });
    await store.create(T, { title: 'p2', amount: 200, stage: 'propuesta' });
    await store.create(T, { title: 'w1', amount: 500, stage: 'ganado' });
    await store.create(T, { title: 'l1', amount: 50, stage: 'perdido' });
    const s = await store.summary(T);
    expect(s.byStage.prospecto).toEqual({ count: 1, total: 100 });
    expect(s.byStage.ganado).toEqual({ count: 1, total: 500 });
    expect(s.byStage.perdido).toEqual({ count: 1, total: 50 });
    expect(s.pipelineValue).toBe(300); // prospecto + propuesta only
  });

  it('remove deletes and returns false for unknown', async () => {
    const store = createMemoryDealsStore();
    const d = await store.create(T, { title: 'x' });
    expect(await store.remove(T, d.id)).toBe(true);
    expect(await store.remove(T, 'missing')).toBe(false);
  });
});
