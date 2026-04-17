import { describe, it, expect, beforeEach, vi } from 'vitest';

function mockAuth(role: 'owner' | 'admin' | 'member' | 'viewer' = 'owner') {
  vi.doMock('@/lib/auth/require-tenant', () => ({
    requireTenant: async () => ({
      ok: true,
      ctx: { userId: 'u1', email: 'u@x.com', tenantId: 't-1', slug: 'acme', role },
    }),
  }));
}

describe('deals API — list + create', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('GET 200 returns empty list and zero summary initially', async () => {
    mockAuth();
    const { GET } = await import('./route');
    const res = await GET(new Request('http://localhost/api/deals'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { items: unknown[]; summary: { pipelineValue: number } };
    };
    expect(body.data.items).toEqual([]);
    expect(body.data.summary.pipelineValue).toBe(0);
  });

  it('POST 201 creates a deal with defaults', async () => {
    mockAuth();
    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://localhost/api/deals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Acme Q1' }),
      }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { title: string; stage: string; currency: string } };
    expect(body.data.title).toBe('Acme Q1');
    expect(body.data.stage).toBe('prospecto');
    expect(body.data.currency).toBe('USD');
  });

  it('POST 400 on invalid body', async () => {
    mockAuth();
    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://localhost/api/deals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('POST 403 for viewers', async () => {
    mockAuth('viewer');
    const { POST } = await import('./route');
    const res = await POST(
      new Request('http://localhost/api/deals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Any' }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it('GET ?stage filters correctly', async () => {
    mockAuth();
    const { POST, GET } = await import('./route');
    await POST(
      new Request('http://localhost/api/deals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'A' }),
      }),
    );
    await POST(
      new Request('http://localhost/api/deals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'B', stage: 'propuesta' }),
      }),
    );
    const res = await GET(new Request('http://localhost/api/deals?stage=propuesta'));
    const body = (await res.json()) as { data: { items: { title: string; stage: string }[] } };
    expect(body.data.items.length).toBe(1);
    expect(body.data.items[0]?.stage).toBe('propuesta');
  });
});
