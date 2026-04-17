/**
 * Rate limiter interface.
 *
 * A real implementation (Upstash) and an in-memory stub both conform.
 * Consumers depend only on this interface so we can swap providers via env.
 */
export interface RateLimiter {
  check(key: string): Promise<{ success: boolean; remaining: number; resetAt: number }>;
}

export type RateLimitConfig = {
  limit: number;
  windowSeconds: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

/**
 * Fixed-window in-memory limiter. Single-process only — suitable for dev and
 * tests. Production uses `createUpstashLimiter(env)` in a follow-up.
 */
export function createMemoryLimiter(config: RateLimitConfig): RateLimiter {
  const buckets = new Map<string, Bucket>();

  return {
    async check(key) {
      const now = Date.now();
      const existing = buckets.get(key);
      if (!existing || existing.resetAt <= now) {
        const resetAt = now + config.windowSeconds * 1000;
        buckets.set(key, { count: 1, resetAt });
        return { success: true, remaining: config.limit - 1, resetAt };
      }
      if (existing.count >= config.limit) {
        return { success: false, remaining: 0, resetAt: existing.resetAt };
      }
      existing.count += 1;
      return {
        success: true,
        remaining: config.limit - existing.count,
        resetAt: existing.resetAt,
      };
    },
  };
}
