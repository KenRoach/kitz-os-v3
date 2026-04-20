/**
 * Mulberry32 — fast deterministic PRNG. Same seed produces the same
 * sequence on every machine, so audit results are reproducible.
 */

export type Rng = {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Float in [min, max). */
  range(min: number, max: number): number;
  /** Random pick from array (uniform). */
  pick<T>(arr: readonly T[]): T;
  /** Bernoulli — true with probability p. */
  bool(p: number): boolean;
  /** Derive a child RNG with its own deterministic seed. Useful for
   *  per-license RNGs so licenses don't interfere with each other when
   *  run in parallel. */
  child(label: string): Rng;
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cheap string → 32-bit hash for child-RNG derivation. */
function hash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function makeRng(seed: number): Rng {
  const next = mulberry32(seed);
  const r: Rng = {
    next,
    int(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    range(min, max) {
      return next() * (max - min) + min;
    },
    pick(arr) {
      if (arr.length === 0) throw new Error('pick: empty array');
      return arr[Math.floor(next() * arr.length)]!;
    },
    bool(p) {
      return next() < p;
    },
    child(label) {
      return makeRng((seed ^ hash32(label)) >>> 0);
    },
  };
  return r;
}
