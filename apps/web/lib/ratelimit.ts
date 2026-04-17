import { createMemoryLimiter, type RateLimiter } from '@kitz/config/ratelimit';

/**
 * Process-wide singleton rate limiter for public auth routes.
 *
 * Stashed on globalThis so HMR in dev does not reset counters. Survives
 * route re-compilation. Production will swap to an Upstash-backed limiter
 * once credentials are wired.
 */
const globalKey = Symbol.for('kitz.authLimiter');

type GlobalWithLimiter = typeof globalThis & {
  [globalKey]?: RateLimiter;
};

const g = globalThis as GlobalWithLimiter;

export function getAuthLimiter(): RateLimiter {
  if (!g[globalKey]) {
    g[globalKey] = createMemoryLimiter({ limit: 10, windowSeconds: 60 * 60 });
  }
  return g[globalKey];
}
