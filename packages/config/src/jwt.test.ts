import { describe, it, expect } from 'vitest';
import { signServiceJwt, verifyServiceJwt } from './jwt.js';

const SECRET = 'test-secret-at-least-32-characters-long-aaa';

describe('service JWT', () => {
  it('signs and verifies a valid token round-trip', async () => {
    const tenantId = 'tenant-123';
    const token = await signServiceJwt(tenantId, SECRET);
    const claims = await verifyServiceJwt(token, SECRET);

    expect(claims.sub).toBe(tenantId);
    expect(claims.iss).toBe('web');
    expect(claims.aud).toBe('ai-runtime');
    expect(claims.exp).toBeGreaterThan(claims.iat);
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signServiceJwt('tenant-1', SECRET);
    const otherSecret = 'different-secret-at-least-32-characters-long';
    await expect(verifyServiceJwt(token, otherSecret)).rejects.toThrow();
  });

  it('rejects an expired token', async () => {
    const token = await signServiceJwt('tenant-1', SECRET, -10);
    await expect(verifyServiceJwt(token, SECRET)).rejects.toThrow();
  });

  it('enforces 5-minute default TTL', async () => {
    const token = await signServiceJwt('tenant-1', SECRET);
    const claims = await verifyServiceJwt(token, SECRET);
    const ttl = claims.exp - claims.iat;
    expect(ttl).toBeGreaterThanOrEqual(299);
    expect(ttl).toBeLessThanOrEqual(301);
  });
});
