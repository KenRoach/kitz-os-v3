import { createMemoryLimiter, type RateLimiter } from '@kitz/config/ratelimit';

/**
 * Singleton rate limiter for public auth routes.
 *
 * In dev uses an in-memory limiter. Production will swap in an Upstash-backed
 * limiter once credentials are wired (env-driven factory).
 */
let cached: RateLimiter | null = null;

export function getAuthLimiter(): RateLimiter {
  if (!cached) {
    cached = createMemoryLimiter({ limit: 10, windowSeconds: 60 * 60 });
  }
  return cached;
}
