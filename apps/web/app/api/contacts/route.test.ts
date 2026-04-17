import { describe, it, expect, beforeEach, vi } from 'vitest';

function mockAuth(role: 'owner' | 'admin' | 'member' | 'viewer' = 'owner', tenantId = 't-1') {
  vi.doMock('@/lib/auth/require-tenant', () => ({
    requireTenant: async () => ({
      ok: true,
      ctx: { userId: 'u1', email: 'u@x.com', tenantId, slug: 'acme', role },
    }),
  }));
}

function mockUnauth() {
  vi.doMock('@/lib/auth/require-tenant', () => ({
    requireTenant: async () => ({ ok: false, status: 401, error: 'unauthenticated' }),
  }));
}

describe('contacts API — list + create', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('GET 401 without session', async () => {
    mockUnauth();
    const { GET } = await import('./route');
    const res = await GET(new Request('http://localhost/api/contacts'));
    expect(res.status).toBe(401);
  });

  it('GET 200 returns tenant contacts', async () => {
    mockAuth();
    const { POST, GET } = await import('./route');
    await POST(
      new Request('http://localhost/api/contacts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Ken Roach' }),
      }),
    );
    const res = await GET(new Request('http://localhost/api/contacts'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { items: { name: string }[] };
      meta: { total: number };
    };
    expect(body.data.items.some((c) => c.name === 'Ken Roach')).toBe(true);
    expect(body.meta.total).toBeGreaterThanOrEqual(1);
  });

  it('GET with ?q= filters', async () => {
    mockAuth();
    const { POST, GET } = await import('./route');
    await POST(
      new Request('http://localhost/api/contacts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Ken Roach', company: 'Acme' }),
      }),
    );
    await POST(
      new Request('http://localhost/api/contacts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Jane Smith', company: 'Beta' }),
      }),
    );
    const res = await GET(new Request('http://localhost/api/contacts?q=acme'));
    const body = (await res.json()) as { data: { items: { name: string }[] } };
    expect(body.data.items.every((c) => c.name.includes('Ken'))).toBe(true);
  });

  it('POST 400 on invalid body', async () => {
    mockAuth();
    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://localhost/api/contacts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ no_name: true }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('POST 403 for viewers', async () => {
    mockAuth('viewer');
    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://localhost/api/contacts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Read Only' }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it('POST 201 creates and echoes contact', async () => {
    mockAuth();
    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://localhost/api/contacts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Ken', email: 'ken@x.com', tags: ['vip'] }),
      }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: string; name: string; tags: string[] } };
    expect(body.data.id).toBeDefined();
    expect(body.data.name).toBe('Ken');
    expect(body.data.tags).toContain('vip');
  });
});
