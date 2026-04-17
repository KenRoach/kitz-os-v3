import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('POST /api/auth/otp', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.RESEND_API_KEY;
  });

  function makeRequest(body: unknown): Request {
    return new Request('http://localhost/api/auth/otp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
      body: JSON.stringify(body),
    });
  }

  it('returns 400 for invalid body', async () => {
    const { POST } = await import('./route.js');
    const res = await POST(makeRequest({ not_email: true }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('invalid_body');
  });

  it('returns 400 for malformed email', async () => {
    const { POST } = await import('./route.js');
    const res = await POST(makeRequest({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
  });

  it('issues an OTP and in dev echoes devCode back', async () => {
    const { POST } = await import('./route.js');
    const res = await POST(makeRequest({ email: 'u@example.com' }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { expiresInSeconds: number; devCode?: string };
    };
    expect(body.success).toBe(true);
    expect(body.data.expiresInSeconds).toBeGreaterThan(0);
    expect(body.data.devCode).toMatch(/^\d{6}$/);
  });

  it('does not echo devCode when RESEND_API_KEY is set', async () => {
    process.env.RESEND_API_KEY = 'stub';
    const { POST } = await import('./route.js');
    const res = await POST(makeRequest({ email: 'u2@example.com' }));
    const body = (await res.json()) as { data: { devCode?: string } };
    expect(body.data.devCode).toBeUndefined();
  });
});
