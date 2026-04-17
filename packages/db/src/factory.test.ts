import { describe, it, expect } from 'vitest';
import { createDbClient } from './factory';

describe('createDbClient', () => {
  it('returns a stub when Supabase env is missing', () => {
    const db = createDbClient({});
    expect(typeof db.createOtp).toBe('function');
    expect(typeof db.findUserByEmail).toBe('function');
  });

  it('returns a working client when Supabase env is present (stub for now)', () => {
    const db = createDbClient({
      SUPABASE_URL: 'https://fake.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'fake-key',
    });
    expect(typeof db.createOtp).toBe('function');
  });

  it('defaults to process.env when no arg passed', () => {
    const db = createDbClient();
    expect(typeof db.createOtp).toBe('function');
  });
});
