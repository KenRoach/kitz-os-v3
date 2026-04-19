import { describe, it, expect } from 'vitest';
import { createMemoryCalendarStore } from './calendar';

const T = 't-1';
const OTHER = 't-2';

const startAt = '2026-05-01T10:00:00.000Z';
const endAt = '2026-05-01T11:00:00.000Z';

describe('calendar store', () => {
  it('creates an event with normalized fields', async () => {
    const store = createMemoryCalendarStore();
    const e = await store.create(T, {
      title: '  Demo  ',
      startAt,
      endAt,
      description: '  notes  ',
      location: '  Zoom  ',
      attendees: ['  a@x.com ', '', 'b@x.com'],
    });
    expect(e.title).toBe('Demo');
    expect(e.description).toBe('notes');
    expect(e.location).toBe('Zoom');
    expect(e.attendees).toEqual(['a@x.com', 'b@x.com']);
    expect(e.external_provider).toBeNull();
  });

  it('rejects empty title', async () => {
    const store = createMemoryCalendarStore();
    await expect(store.create(T, { title: '   ', startAt, endAt })).rejects.toThrow(
      'invalid_title',
    );
  });

  it('rejects malformed dates', async () => {
    const store = createMemoryCalendarStore();
    await expect(store.create(T, { title: 'x', startAt: 'not-a-date', endAt })).rejects.toThrow(
      'invalid_dates',
    );
    await expect(store.create(T, { title: 'x', startAt: endAt, endAt: startAt })).rejects.toThrow(
      'invalid_dates',
    );
  });

  it('list filters by from/to window', async () => {
    const store = createMemoryCalendarStore();
    await store.create(T, { title: 'a', startAt, endAt });
    await store.create(T, {
      title: 'b',
      startAt: '2026-05-02T10:00:00.000Z',
      endAt: '2026-05-02T11:00:00.000Z',
    });
    await store.create(T, {
      title: 'c',
      startAt: '2026-06-01T10:00:00.000Z',
      endAt: '2026-06-01T11:00:00.000Z',
    });
    const may = await store.list(T, {
      from: '2026-05-01T00:00:00.000Z',
      to: '2026-05-31T23:59:59.000Z',
    });
    expect(may.map((e) => e.title)).toEqual(['a', 'b']);
  });

  it('isolates per tenant', async () => {
    const store = createMemoryCalendarStore();
    await store.create(T, { title: 'mine', startAt, endAt });
    await store.create(OTHER, { title: 'theirs', startAt, endAt });
    expect((await store.list(T)).length).toBe(1);
    expect((await store.list(OTHER)).length).toBe(1);
  });

  it('update validates date order on transition', async () => {
    const store = createMemoryCalendarStore();
    const e = await store.create(T, { title: 'x', startAt, endAt });
    await expect(store.update(T, e.id, { startAt: '2026-05-01T12:00:00.000Z' })).rejects.toThrow(
      'invalid_dates',
    );
    const ok = await store.update(T, e.id, {
      endAt: '2026-05-01T13:00:00.000Z',
    });
    expect(ok?.end_at).toBe('2026-05-01T13:00:00.000Z');
  });

  it('remove + count', async () => {
    const store = createMemoryCalendarStore();
    const e = await store.create(T, { title: 'x', startAt, endAt });
    expect(await store.count(T)).toBe(1);
    expect(await store.remove(T, e.id)).toBe(true);
    expect(await store.count(T)).toBe(0);
    expect(await store.remove(T, 'missing')).toBe(false);
  });
});
