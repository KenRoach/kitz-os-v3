import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import type { DbClient } from '@kitz/db';

const OTP_LENGTH = 6;
const OTP_TTL_SECONDS = 10 * 60;
const MAX_ATTEMPTS = 5;

export type OtpIssueResult = { ok: true; expiresInSeconds: number };

export type OtpVerifyResult =
  | { ok: true; userId: string; token: string }
  | { ok: false; reason: 'no_active_otp' | 'too_many_attempts' | 'invalid_code' | 'expired' };

/**
 * Generate a 6-digit numeric OTP. Leading zeros preserved.
 */
export function generateOtpCode(): string {
  const n = randomInt(0, 1_000_000);
  return n.toString().padStart(OTP_LENGTH, '0');
}

/**
 * SHA-256 hash of the code. Sufficient here because codes are 6 digits with
 * a 10-minute TTL, a 5-attempt cap, and a one-active-OTP-per-email policy —
 * brute force has negligible success probability in that window.
 */
export function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function safeHexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

/**
 * Create a one-time OTP for the given email.
 * Returns the plain code so the caller can dispatch it (email, SMS, etc.).
 */
export async function issueOtp(
  db: DbClient,
  email: string,
): Promise<OtpIssueResult & { code: string }> {
  const code = generateOtpCode();
  await db.createOtp({
    email: email.toLowerCase().trim(),
    codeHash: hashCode(code),
    ttlSeconds: OTP_TTL_SECONDS,
  });
  return { ok: true, expiresInSeconds: OTP_TTL_SECONDS, code };
}

/**
 * Verify a submitted code. On success, creates the user if needed and
 * returns a session token.
 */
export async function verifyOtp(
  db: DbClient,
  email: string,
  submittedCode: string,
): Promise<OtpVerifyResult> {
  const normalized = email.toLowerCase().trim();
  const otp = await db.findActiveOtp(normalized);
  if (!otp) return { ok: false, reason: 'no_active_otp' };

  if (new Date(otp.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: 'too_many_attempts' };
  }

  const submittedHash = hashCode(submittedCode);
  if (!safeHexEqual(submittedHash, otp.code_hash)) {
    await db.incrementOtpAttempts(otp.id);
    return { ok: false, reason: 'invalid_code' };
  }

  await db.consumeOtp(otp.id);

  let user = await db.findUserByEmail(normalized);
  if (!user) {
    user = await db.createUser({ email: normalized });
  }

  const session = await db.createSession(user.id, user.email);
  return { ok: true, userId: user.id, token: session.token };
}
