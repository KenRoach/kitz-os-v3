import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('POST /api/onboarding', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 401 without a session cookie', async () => {
    vi.doMock('next/headers', () => ({
      cookies: async () => ({ get: (_: string) => undefined }),
    }));
    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://localhost/api/onboarding', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspaceName: 'Acme', fullName: 'Ken' }),
      }),
    );
    expect(res.status).toBe(401);
  });
});
