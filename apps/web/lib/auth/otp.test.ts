import { describe, it, expect } from 'vitest';
import { createStubDb } from '@kitz/db/stub';
import { generateOtpCode, hashCode, issueOtp, verifyOtp } from './otp.js';

describe('generateOtpCode', () => {
  it('returns a 6-digit numeric string', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });
});

describe('hashCode', () => {
  it('is deterministic', () => {
    expect(hashCode('123456')).toBe(hashCode('123456'));
  });
  it('differs for different inputs', () => {
    expect(hashCode('123456')).not.toBe(hashCode('654321'));
  });
});

describe('issueOtp + verifyOtp happy path', () => {
  it('issues, stores, and verifies a code for a new user', async () => {
    const db = createStubDb();
    const { code } = await issueOtp(db, 'New@Example.com');
    const result = await verifyOtp(db, 'new@example.com', code);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBeDefined();
      expect(result.token).toBeDefined();
      const session = await db.findSessionByToken(result.token);
      expect(session?.email).toBe('new@example.com');
    }
  });

  it('reuses existing user record on second login', async () => {
    const db = createStubDb();
    const { code: code1 } = await issueOtp(db, 'ken@example.com');
    const first = await verifyOtp(db, 'ken@example.com', code1);
    const { code: code2 } = await issueOtp(db, 'ken@example.com');
    const second = await verifyOtp(db, 'ken@example.com', code2);
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.userId).toBe(second.userId);
    }
  });
});

describe('verifyOtp failure modes', () => {
  it('returns no_active_otp if none issued', async () => {
    const db = createStubDb();
    const result = await verifyOtp(db, 'ghost@x.com', '000000');
    expect(result).toEqual({ ok: false, reason: 'no_active_otp' });
  });

  it('returns invalid_code for wrong code', async () => {
    const db = createStubDb();
    await issueOtp(db, 'u@x.com');
    const result = await verifyOtp(db, 'u@x.com', '000000');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_code');
  });

  it('increments attempts on each wrong guess', async () => {
    const db = createStubDb();
    await issueOtp(db, 'a@x.com');
    for (let i = 0; i < 5; i++) {
      await verifyOtp(db, 'a@x.com', '000000');
    }
    const sixth = await verifyOtp(db, 'a@x.com', '000000');
    expect(sixth.ok).toBe(false);
    if (!sixth.ok) expect(sixth.reason).toBe('too_many_attempts');
  });

  it('treats email case-insensitively', async () => {
    const db = createStubDb();
    const { code } = await issueOtp(db, 'MIXED@Case.COM');
    const result = await verifyOtp(db, 'mixed@case.com', code);
    expect(result.ok).toBe(true);
  });
});
