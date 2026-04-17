import { describe, it, expect } from 'vitest';
import { signServiceJwt } from '@kitz/config/jwt';
import { buildApp } from './app.js';

const SECRET = 'test-secret-at-least-32-characters-long-aaa';

describe('ai-runtime app', () => {
  it('GET /live returns 200 with service metadata (no auth)', async () => {
    const app = buildApp({ serviceJwtSecret: SECRET });
    const res = await app.inject({ method: 'GET', url: '/live' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.service).toBe('ai-runtime');
    await app.close();
  });

  it('GET /health returns 401 without a bearer token', async () => {
    const app = buildApp({ serviceJwtSecret: SECRET });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('missing_service_token');
    await app.close();
  });

  it('GET /health returns 401 with an invalid token', async () => {
    const app = buildApp({ serviceJwtSecret: SECRET });
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { authorization: 'Bearer not-a-real-jwt' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('invalid_service_token');
    await app.close();
  });

  it('GET /health returns 200 with a valid service JWT and echoes tenant', async () => {
    const app = buildApp({ serviceJwtSecret: SECRET });
    const tenantId = 'tenant-abc';
    const token = await signServiceJwt(tenantId, SECRET);
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.tenant_id).toBe(tenantId);
    await app.close();
  });
});
