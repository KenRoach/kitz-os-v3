const MIN_LEN = 2;
const MAX_LEN = 64;

/**
 * Convert a workspace name into a URL-safe slug.
 *
 * - Lowercase
 * - Spaces and underscores → hyphens
 * - Strips accents (NFD) and anything not [a-z0-9-]
 * - Collapses runs of hyphens
 * - Trims leading/trailing hyphens
 * - Clamped to MAX_LEN characters
 */
export function slugify(raw: string): string {
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized.slice(0, MAX_LEN);
}

export function isValidSlug(slug: string): boolean {
  if (slug.length < MIN_LEN || slug.length > MAX_LEN) return false;
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug);
}

/**
 * Add a numeric suffix to a slug (for uniqueness retries).
 * e.g. "acme" → "acme-2" → "acme-3"
 */
export function suffixSlug(base: string, n: number): string {
  const suffix = `-${n}`;
  const max = MAX_LEN - suffix.length;
  return `${base.slice(0, max)}${suffix}`;
}
