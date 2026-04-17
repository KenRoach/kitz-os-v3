import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('POST /api/auth/signout', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('always returns 200 and clears the session cookie (no token)', async () => {
    const { POST } = await import('./route');
    const res = await POST(new Request('http://localhost/api/auth/signout', { method: 'POST' }));
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('kitz_session=');
    expect(setCookie).toContain('Max-Age=0');
  });

  it('revokes the session when a cookie is present', async () => {
    const dbMod = await import('@/lib/db');
    const token = 'revoke-me-token';
    // Plant a session directly on the singleton stub
    const db = dbMod.getDb();
    const session = await db.createSession('user-signout', 's@x.com');
    const existing = await db.findSessionByToken(session.token);
    expect(existing).not.toBeNull();

    const { POST } = await import('./route');
    await POST(
      new Request('http://localhost/api/auth/signout', {
        method: 'POST',
        headers: { cookie: `kitz_session=${session.token}; other=ignored` },
      }),
    );
    expect(await db.findSessionByToken(session.token)).toBeNull();
    // guard against unused
    expect(token).toBe('revoke-me-token');
  });
});
