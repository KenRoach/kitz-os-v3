import type { Rng } from './rng';

/**
 * Knuth poisson sampler. Slow for large lambda but correct; we never
 * draw with lambda > 50 here so the loop count stays bounded.
 */
export function poisson(rng: Rng, lambda: number): number {
  if (lambda <= 0) return 0;
  if (lambda > 30) {
    // Normal approximation for large lambda (mean=lambda, var=lambda).
    const u1 = rng.next();
    const u2 = rng.next();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * z));
  }
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng.next();
  } while (p > L);
  return k - 1;
}

/**
 * Weighted pick from a record of {key: weight}. Weights need not sum to 1.
 */
export function weightedPick<K extends string>(rng: Rng, weights: Record<K, number>): K {
  const entries = Object.entries(weights) as [K, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng.next() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return entries[entries.length - 1]![0];
}

/**
 * Per-day "is this user active today" check. We model retention as a
 * geometric decay so day-30 retention = retentionD30. The daily survival
 * probability `p` satisfies p^30 = retentionD30, so p = retentionD30^(1/30).
 */
export function isActiveDay(rng: Rng, day: number, retentionD30: number): boolean {
  const dailySurvival = Math.pow(Math.max(retentionD30, 0.01), 1 / 30);
  // Probability the user has survived to `day` AND is engaging today.
  // Engagement-given-survival is fixed at 0.5 — accounts for "active but
  // not in the app today" without making retention curves unrealistic.
  const surviveTo = Math.pow(dailySurvival, day);
  const engagementToday = 0.5;
  return rng.bool(surviveTo * engagementToday);
}
