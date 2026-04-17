import { describe, it, expect } from 'vitest';
import { signServiceJwt } from '@kitz/config/jwt';
import { buildApp } from './app.js';

const SECRET = 'test-secret-at-least-32-characters-long-aaa';

async function authed(app: ReturnType<typeof buildApp>, body: unknown) {
  const token = await signServiceJwt('tenant-demo', SECRET);
  return app.inject({
    method: 'POST',
    url: '/chat',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    payload: body as object,
  });
}

describe('POST /chat', () => {
  it('401s without a bearer token', async () => {
    const app = buildApp({ serviceJwtSecret: SECRET });
    const res = await app.inject({
      method: 'POST',
      url: '/chat',
      headers: { 'content-type': 'application/json' },
      payload: { message: 'hi' },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('400s on missing message', async () => {
    const app = buildApp({ serviceJwtSecret: SECRET });
    const res = await authed(app, { not_message: true });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('missing_message');
    await app.close();
  });

  it('400s on empty message', async () => {
    const app = buildApp({ serviceJwtSecret: SECRET });
    const res = await authed(app, { message: '   ' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('invalid_message_length');
    await app.close();
  });

  it('200s with a stub reply and shape', async () => {
    const app = buildApp({ serviceJwtSecret: SECRET });
    const res = await authed(app, { message: 'Hola Kitz' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.model).toBe('stub');
    expect(typeof body.data.reply).toBe('string');
    expect(body.data.reply.length).toBeGreaterThan(0);
    expect(body.data.tokensUsed).toBeGreaterThan(0);
    expect(body.data.latencyMs).toBeGreaterThanOrEqual(0);
    await app.close();
  });

  it('stub greets back when message contains "hola"', async () => {
    const app = buildApp({ serviceJwtSecret: SECRET });
    const res = await authed(app, { message: 'hola' });
    expect(res.json().data.reply.toLowerCase()).toContain('hola');
    await app.close();
  });
});
