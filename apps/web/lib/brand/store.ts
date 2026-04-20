/**
 * Per-tenant brand settings — the small pile of data the quote
 * template needs to look like the customer's own document: logo,
 * accent color, business name, tax id, address, footer note.
 *
 * Scope: in-memory, globalThis-pinned (same pattern as prefsStore /
 * eventBus / chatHistoryStore). Migrates cleanly to a
 * `tenant_brand_settings` row in Supabase — one row per tenant —
 * by swapping the backing Map for a Supabase SELECT/UPSERT.
 *
 * Design note: `logoUrl` is a data URL when the user pastes a
 * direct file (no upload infra required for the quoter to ship).
 * Swap for a Supabase Storage URL when you wire real uploads.
 * Cap the stored size at ~2MB to stop a process-memory balloon.
 */

export type BrandSettings = {
  tenantId: string;
  businessName: string;
  /** Legal / tax id — RUC, CUIT, RFC, EIN, etc. Kept as free-form string. */
  taxId: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  /** Data URL or remote URL — template uses it as-is. */
  logoUrl: string | null;
  /** Any CSS color string. Template uses it for the title bar + totals accent. */
  accentColor: string;
  /** Footer small-print. Free-form. Max ~500 chars. */
  footerNote: string | null;
  /** Default tax rate used when creating a new invoice. 0..1 range. */
  defaultTaxRate: number;
  /** ISO 4217. */
  defaultCurrency: string;
  updatedAt: string;
};

export const DEFAULT_ACCENT = '#111111';
export const DEFAULT_CURRENCY = 'USD';
export const DEFAULT_TAX_RATE = 0.07;

function defaults(tenantId: string, fallbackName: string): BrandSettings {
  return {
    tenantId,
    businessName: fallbackName,
    taxId: null,
    address: null,
    email: null,
    phone: null,
    website: null,
    logoUrl: null,
    accentColor: DEFAULT_ACCENT,
    footerNote: null,
    defaultTaxRate: DEFAULT_TAX_RATE,
    defaultCurrency: DEFAULT_CURRENCY,
    updatedAt: new Date().toISOString(),
  };
}

export type BrandSettingsPatch = Partial<
  Omit<BrandSettings, 'tenantId' | 'updatedAt'>
>;

class BrandStore {
  private rows = new Map<string, BrandSettings>();

  get(tenantId: string, fallbackName: string): BrandSettings {
    const existing = this.rows.get(tenantId);
    if (existing) return existing;
    const seeded = defaults(tenantId, fallbackName);
    this.rows.set(tenantId, seeded);
    return seeded;
  }

  update(tenantId: string, fallbackName: string, patch: BrandSettingsPatch): BrandSettings {
    const current = this.get(tenantId, fallbackName);
    const next: BrandSettings = {
      ...current,
      ...patch,
      tenantId,
      updatedAt: new Date().toISOString(),
    };
    this.rows.set(tenantId, next);
    return next;
  }
}

const g = globalThis as unknown as { __kitzBrandStore?: BrandStore };
export const brandStore: BrandStore = g.__kitzBrandStore ?? new BrandStore();
if (!g.__kitzBrandStore) g.__kitzBrandStore = brandStore;
