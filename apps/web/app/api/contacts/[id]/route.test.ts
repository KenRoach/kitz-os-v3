import { describe, it, expect, beforeEach, vi } from 'vitest';

function mockAuth(role: 'owner' | 'admin' | 'member' | 'viewer' = 'owner') {
  vi.doMock('@/lib/auth/require-tenant', () => ({
    requireTenant: async () => ({
      ok: true,
      ctx: { userId: 'u1', email: 'u@x.com', tenantId: 't-1', slug: 'acme', role },
    }),
  }));
}

async function seedContact(name = 'Seed'): Promise<string> {
  const listMod = await import('../route');
  const res = await listMod.POST(
    new Request('http://localhost/api/contacts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
    }),
  );
  const body = (await res.json()) as { data: { id: string } };
  return body.data.id;
}

describe('contacts API — detail', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('GET 404 for unknown id', async () => {
    mockAuth();
    const { GET } = await import('./route');
    const res = await GET(new Request('http://localhost/api/contacts/missing'), {
      params: Promise.resolve({ id: 'missing' }),
    });
    expect(res.status).toBe(404);
  });

  it('GET 200 for existing id', async () => {
    mockAuth();
    const id = await seedContact('Detail Ken');
    const { GET } = await import('./route');
    const res = await GET(new Request(`http://localhost/api/contacts/${id}`), {
      params: Promise.resolve({ id }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { name: string } };
    expect(body.data.name).toBe('Detail Ken');
  });

  it('PATCH 200 updates fields', async () => {
    mockAuth();
    const id = await seedContact('Patchable');
    const { PATCH } = await import('./route');
    const res = await PATCH(
      new Request(`http://localhost/api/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notes: 'updated' }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { notes: string } };
    expect(body.data.notes).toBe('updated');
  });

  it('PATCH 403 for viewers', async () => {
    mockAuth('viewer');
    const { PATCH } = await import('./route');
    const res = await PATCH(
      new Request('http://localhost/api/contacts/any', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notes: 'nope' }),
      }),
      { params: Promise.resolve({ id: 'any' }) },
    );
    expect(res.status).toBe(403);
  });

  it('DELETE 200 removes', async () => {
    mockAuth();
    const id = await seedContact('Doomed');
    const { DELETE } = await import('./route');
    const res = await DELETE(
      new Request(`http://localhost/api/contacts/${id}`, { method: 'DELETE' }),
      {
        params: Promise.resolve({ id }),
      },
    );
    expect(res.status).toBe(200);
  });

  it('DELETE 404 for missing', async () => {
    mockAuth();
    const { DELETE } = await import('./route');
    const res = await DELETE(
      new Request('http://localhost/api/contacts/missing', { method: 'DELETE' }),
      {
        params: Promise.resolve({ id: 'missing' }),
      },
    );
    expect(res.status).toBe(404);
  });
});
