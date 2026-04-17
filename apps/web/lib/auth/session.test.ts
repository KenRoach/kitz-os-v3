import { describe, it, expect } from 'vitest';
import { createStubDb } from '@kitz/db/stub';
import { resolveSession, sessionCookieOptions } from './session.js';

describe('sessionCookieOptions', () => {
  it('sets secure=true in production', () => {
    const opts = sessionCookieOptions(true);
    expect(opts.secure).toBe(true);
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('lax');
  });

  it('sets secure=false outside production', () => {
    expect(sessionCookieOptions(false).secure).toBe(false);
  });
});

describe('resolveSession', () => {
  it('returns null for undefined cookie', async () => {
    const db = createStubDb();
    expect(await resolveSession(db, undefined)).toBeNull();
  });

  it('returns null for unknown token', async () => {
    const db = createStubDb();
    expect(await resolveSession(db, 'not-a-real-token')).toBeNull();
  });

  it('returns the session for a valid token', async () => {
    const db = createStubDb();
    const { token } = await db.createSession('user-1', 'u@x.com');
    const session = await resolveSession(db, token);
    expect(session?.email).toBe('u@x.com');
  });
});
