import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('POST /api/auth/verify', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.RESEND_API_KEY;
  });

  async function issueThenVerify(email: string, submitted: string) {
    const otpMod = await import('../otp/route.js');
    const otpReq = new Request('http://localhost/api/auth/otp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '9.9.9.9' },
      body: JSON.stringify({ email }),
    });
    const otpRes = await otpMod.POST(otpReq);
    const otpBody = (await otpRes.json()) as { data: { devCode: string } };
    const actualCode = otpBody.data.devCode;

    const verifyMod = await import('./route.js');
    const verifyReq = new Request('http://localhost/api/auth/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, code: submitted === 'USE_REAL' ? actualCode : submitted }),
    });
    return verifyMod.POST(verifyReq);
  }

  it('returns 400 on malformed body', async () => {
    const { POST } = await import('./route.js');
    const res = await POST(
      new Request('http://localhost/api/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'not-email', code: 'abc' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 401 for invalid code', async () => {
    const res = await issueThenVerify('a@x.com', '000000');
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('invalid_code');
  });

  it('returns 200 and sets session cookie on valid code', async () => {
    const res = await issueThenVerify('b@x.com', 'USE_REAL');
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('kitz_session=');
    expect(setCookie).toContain('HttpOnly');
  });
});
