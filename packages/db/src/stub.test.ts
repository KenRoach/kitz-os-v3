import { describe, it, expect } from 'vitest';
import { createStubDb } from './stub';

describe('stub DbClient', () => {
  it('creates and finds an active OTP', async () => {
    const db = createStubDb();
    const created = await db.createOtp({
      email: 'a@example.com',
      codeHash: 'hash-1',
      ttlSeconds: 600,
    });
    expect(created.email).toBe('a@example.com');
    const found = await db.findActiveOtp('a@example.com');
    expect(found?.id).toBe(created.id);
  });

  it('returns null for expired OTP', async () => {
    const db = createStubDb();
    await db.createOtp({ email: 'b@example.com', codeHash: 'h', ttlSeconds: -1 });
    expect(await db.findActiveOtp('b@example.com')).toBeNull();
  });

  it('invalidates prior active OTP when a new one is created', async () => {
    const db = createStubDb();
    const first = await db.createOtp({
      email: 'c@example.com',
      codeHash: 'h1',
      ttlSeconds: 600,
    });
    const second = await db.createOtp({
      email: 'c@example.com',
      codeHash: 'h2',
      ttlSeconds: 600,
    });
    const active = await db.findActiveOtp('c@example.com');
    expect(active?.id).toBe(second.id);
    expect(active?.id).not.toBe(first.id);
  });

  it('increments attempts and consumes OTP', async () => {
    const db = createStubDb();
    const otp = await db.createOtp({ email: 'd@x.com', codeHash: 'h', ttlSeconds: 600 });
    expect(await db.incrementOtpAttempts(otp.id)).toBe(1);
    expect(await db.incrementOtpAttempts(otp.id)).toBe(2);
    await db.consumeOtp(otp.id);
    expect(await db.findActiveOtp('d@x.com')).toBeNull();
  });

  it('throws on increment/consume of unknown OTP', async () => {
    const db = createStubDb();
    await expect(db.incrementOtpAttempts('missing')).rejects.toThrow('otp_not_found');
    await expect(db.consumeOtp('missing')).rejects.toThrow('otp_not_found');
  });

  it('creates and finds user by email', async () => {
    const db = createStubDb();
    const user = await db.createUser({ email: 'u@x.com' });
    expect(user.locale).toBe('es');
    const found = await db.findUserByEmail('u@x.com');
    expect(found?.id).toBe(user.id);
  });

  it('rejects duplicate user creation', async () => {
    const db = createStubDb();
    await db.createUser({ email: 'dup@x.com' });
    await expect(db.createUser({ email: 'dup@x.com' })).rejects.toThrow('user_exists');
  });

  it('returns null for unknown user', async () => {
    const db = createStubDb();
    expect(await db.findUserByEmail('nope@x.com')).toBeNull();
  });

  it('creates, finds, and revokes sessions', async () => {
    const db = createStubDb();
    const { token, user_id } = await db.createSession('user-1', 's@x.com');
    const session = await db.findSessionByToken(token);
    expect(session?.user_id).toBe(user_id);
    await db.revokeSession(token);
    expect(await db.findSessionByToken(token)).toBeNull();
  });

  it('findPrimaryTenant returns null for user with no membership', async () => {
    const db = createStubDb();
    expect(await db.findPrimaryTenant('ghost')).toBeNull();
  });
});
