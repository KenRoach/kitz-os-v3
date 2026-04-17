import type { DbClient } from '@kitz/db';
import type { AuthSession } from '@kitz/db/types';

export const SESSION_COOKIE_NAME = 'kitz_session';
export const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60; // 1 hour, matches stub

export type SessionCookieOptions = {
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  maxAge: number;
  httpOnly: true;
};

export function sessionCookieOptions(isProd: boolean): SessionCookieOptions {
  return {
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
    httpOnly: true,
  };
}

/**
 * Look up the session for a given cookie value. Returns null if missing or
 * expired. The DB client auto-purges expired sessions on lookup.
 */
export async function resolveSession(
  db: DbClient,
  cookieValue: string | undefined,
): Promise<AuthSession | null> {
  if (!cookieValue) return null;
  return db.findSessionByToken(cookieValue);
}
