import { describe, it, expect } from 'vitest';
import { getDb } from './db';

describe('getDb singleton', () => {
  it('returns the same DbClient across calls (persists state across HMR)', async () => {
    const a = getDb();
    const b = getDb();
    expect(a).toBe(b);
  });

  it('state created via one reference is visible via another', async () => {
    const a = getDb();
    await a.createUser({ email: 'singleton-probe@kitz.local' });
    const b = getDb();
    const found = await b.findUserByEmail('singleton-probe@kitz.local');
    expect(found).not.toBeNull();
    expect(found?.email).toBe('singleton-probe@kitz.local');
  });
});
