import { describe, it, expect } from 'vitest';
import { createMemoryLimiter } from './ratelimit.js';

describe('memory rate limiter', () => {
  it('allows requests up to the limit', async () => {
    const limiter = createMemoryLimiter({ limit: 3, windowSeconds: 60 });
    expect((await limiter.check('k')).success).toBe(true);
    expect((await limiter.check('k')).success).toBe(true);
    expect((await limiter.check('k')).success).toBe(true);
    expect((await limiter.check('k')).success).toBe(false);
  });

  it('tracks remaining count', async () => {
    const limiter = createMemoryLimiter({ limit: 5, windowSeconds: 60 });
    expect((await limiter.check('x')).remaining).toBe(4);
    expect((await limiter.check('x')).remaining).toBe(3);
  });

  it('isolates keys', async () => {
    const limiter = createMemoryLimiter({ limit: 1, windowSeconds: 60 });
    expect((await limiter.check('a')).success).toBe(true);
    expect((await limiter.check('b')).success).toBe(true);
    expect((await limiter.check('a')).success).toBe(false);
  });

  it('resets after the window elapses', async () => {
    const limiter = createMemoryLimiter({ limit: 1, windowSeconds: 0 });
    expect((await limiter.check('y')).success).toBe(true);
    // windowSeconds=0 means next call is always a fresh window
    await new Promise((r) => setTimeout(r, 5));
    expect((await limiter.check('y')).success).toBe(true);
  });
});
