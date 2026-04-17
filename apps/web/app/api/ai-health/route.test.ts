import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const SECRET = 'test-secret-at-least-32-characters-long-aaa';

describe('GET /api/ai-health', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SERVICE_JWT_SECRET;
    delete process.env.OS_RUNTIME_URL;
  });

  it('returns 500 when SERVICE_JWT_SECRET is missing', async () => {
    const { GET } = await import('./route.js');
    const res = await GET();
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('service_jwt_secret_not_configured');
  });

  it('signs a JWT and forwards the upstream response when secret is set', async () => {
    process.env.SERVICE_JWT_SECRET = SECRET;
    process.env.OS_RUNTIME_URL = 'http://ai-runtime.test';

    const upstreamBody = { success: true, data: { tenant_id: 'phase1-stub-tenant' }, error: null };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200,
      json: async () => upstreamBody,
    });

    const { GET } = await import('./route.js');
    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(upstreamBody);

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledOnce();
    const firstCall = fetchMock.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(firstCall[0]).toBe('http://ai-runtime.test/health');
    expect(firstCall[1].headers.authorization).toMatch(/^Bearer .+\..+\..+$/);
  });
});
