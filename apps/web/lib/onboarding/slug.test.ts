import { describe, it, expect } from 'vitest';
import { slugify, isValidSlug, suffixSlug } from './slug';

describe('slugify', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugify('Acme Corp')).toBe('acme-corp');
  });

  it('strips accents', () => {
    expect(slugify('Ángel & Niño')).toBe('angel-nino');
  });

  it('collapses multiple spaces and hyphens', () => {
    expect(slugify('foo   bar---baz')).toBe('foo-bar-baz');
  });

  it('strips leading and trailing hyphens', () => {
    expect(slugify('---hi---')).toBe('hi');
  });

  it('drops emoji and other non-ASCII', () => {
    expect(slugify('kitz 🚀 team')).toBe('kitz-team');
  });

  it('clamps at 64 characters', () => {
    const long = 'a'.repeat(100);
    expect(slugify(long).length).toBe(64);
  });

  it('converts underscores to hyphens', () => {
    expect(slugify('foo_bar_baz')).toBe('foo-bar-baz');
  });
});

describe('isValidSlug', () => {
  it('accepts lowercase alphanumeric with internal hyphens', () => {
    expect(isValidSlug('acme')).toBe(true);
    expect(isValidSlug('acme-corp')).toBe(true);
    expect(isValidSlug('kitz-2026')).toBe(true);
  });

  it('rejects too short', () => {
    expect(isValidSlug('a')).toBe(false);
    expect(isValidSlug('')).toBe(false);
  });

  it('rejects too long', () => {
    expect(isValidSlug('a'.repeat(65))).toBe(false);
  });

  it('rejects leading or trailing hyphens', () => {
    expect(isValidSlug('-acme')).toBe(false);
    expect(isValidSlug('acme-')).toBe(false);
  });

  it('rejects uppercase and punctuation', () => {
    expect(isValidSlug('Acme')).toBe(false);
    expect(isValidSlug('acme.corp')).toBe(false);
    expect(isValidSlug('acme_corp')).toBe(false);
  });
});

describe('suffixSlug', () => {
  it('adds a suffix', () => {
    expect(suffixSlug('acme', 2)).toBe('acme-2');
  });

  it('preserves room for the suffix at the 64-char limit', () => {
    const base = 'a'.repeat(64);
    const result = suffixSlug(base, 99);
    expect(result.length).toBeLessThanOrEqual(64);
    expect(result).toMatch(/-99$/);
  });
});
