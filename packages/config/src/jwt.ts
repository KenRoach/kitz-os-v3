import { SignJWT, jwtVerify } from 'jose';
import type { ServiceJwtClaims } from '@kitz/types';

const ALGORITHM = 'HS256';
const ISSUER = 'web';
const AUDIENCE = 'ai-runtime';
const DEFAULT_TTL_SECONDS = 5 * 60; // 5 minutes

function toKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

/**
 * Sign a short-lived service JWT for web → ai-runtime calls.
 * @param tenantId subject claim (tenant context)
 * @param secret   SERVICE_JWT_SECRET (32+ bytes)
 * @param ttlSeconds token lifetime, default 5 minutes
 */
export async function signServiceJwt(
  tenantId: string,
  secret: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(tenantId)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(toKey(secret));
}

/**
 * Verify a service JWT on the ai-runtime side.
 * Throws if token is invalid, expired, or claims mismatch.
 */
export async function verifyServiceJwt(token: string, secret: string): Promise<ServiceJwtClaims> {
  const { payload } = await jwtVerify(token, toKey(secret), {
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithms: [ALGORITHM],
  });

  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new Error('Invalid service JWT: missing sub (tenant_id)');
  }
  if (typeof payload.exp !== 'number' || typeof payload.iat !== 'number') {
    throw new Error('Invalid service JWT: missing exp/iat');
  }

  return {
    iss: ISSUER,
    aud: AUDIENCE,
    sub: payload.sub,
    exp: payload.exp,
    iat: payload.iat,
  };
}
