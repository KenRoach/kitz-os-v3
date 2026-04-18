import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const SECRET = 'test-secret-at-least-32-characters-long-aaa';

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.SERVICE_JWT_SECRET = SECRET;
    process.env.OS_RUNTIME_URL = 'http://ai-runtime.test';
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SERVICE_JWT_SECRET;
    delete process.env.OS_RUNTIME_URL;
  });

  function makeReq(body: unknown): Request {
    return new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('401 without a session', async () => {
    vi.doMock('next/headers', () => ({
      cookies: async () => ({ get: (_: string) => undefined }),
    }));
    const { POST } = await import('./route');
    const res = await POST(makeReq({ message: 'hi' }));
    expect(res.status).toBe(401);
  });

  it('409 when user has no tenant', async () => {
    vi.doMock('next/headers', () => ({
      cookies: async () => ({ get: (_: string) => ({ value: 'some-token' }) }),
    }));
    vi.doMock('@/lib/auth/session', async () => ({
      SESSION_COOKIE_NAME: 'kitz_session',
      resolveSession: async () => ({ user_id: 'u1', email: 'u@x.com' }),
    }));
    vi.doMock('@/lib/db', async () => ({
      getDb: () => ({
        findPrimaryTenant: async () => null,
        recordActivity: async () => {
          /* noop */
        },
      }),
    }));
    const { POST } = await import('./route');
    const res = await POST(makeReq({ message: 'hi' }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('no_tenant');
  });

  it('400 on invalid body', async () => {
    vi.doMock('next/headers', () => ({
      cookies: async () => ({ get: (_: string) => ({ value: 'tok' }) }),
    }));
    vi.doMock('@/lib/auth/session', async () => ({
      SESSION_COOKIE_NAME: 'kitz_session',
      resolveSession: async () => ({ user_id: 'u1', email: 'u@x.com' }),
    }));
    vi.doMock('@/lib/db', async () => ({
      getDb: () => ({
        findPrimaryTenant: async () => ({ tenant: { id: 't1' }, membership: {} }),
        recordActivity: async () => {
          /* noop */
        },
      }),
    }));
    const { POST } = await import('./route');
    const res = await POST(makeReq({ not_message: true }));
    expect(res.status).toBe(400);
  });

  it('forwards to ai-runtime with JWT and records activity on 200', async () => {
    const recordSpy = vi.fn(async () => undefined);
    vi.doMock('next/headers', () => ({
      cookies: async () => ({ get: (_: string) => ({ value: 'tok' }) }),
    }));
    vi.doMock('@/lib/auth/session', async () => ({
      SESSION_COOKIE_NAME: 'kitz_session',
      resolveSession: async () => ({ user_id: 'u1', email: 'u@x.com' }),
    }));
    vi.doMock('@/lib/db', async () => ({
      getDb: () => ({
        findPrimaryTenant: async () => ({ tenant: { id: 't-abc' }, membership: {} }),
        recordActivity: recordSpy,
        agents: { getActive: async () => null },
      }),
    }));

    const upstreamBody = {
      success: true,
      data: { reply: 'Hola de vuelta', model: 'stub', tokensUsed: 5, latencyMs: 1 },
      error: null,
    };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => upstreamBody,
    });

    const { POST } = await import('./route');
    const res = await POST(makeReq({ message: 'hola' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(upstreamBody);

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      { headers: Record<string, string>; method: string },
    ];
    expect(url).toBe('http://ai-runtime.test/chat');
    expect(init.method).toBe('POST');
    expect(init.headers.authorization).toMatch(/^Bearer .+\..+\..+$/);
    expect(recordSpy).toHaveBeenCalledOnce();
    expect(recordSpy).toHaveBeenCalledWith({
      tenantId: 't-abc',
      actor: 'u1',
      action: 'sent_message',
      entity: 'kitz-chat',
    });
  });
});
