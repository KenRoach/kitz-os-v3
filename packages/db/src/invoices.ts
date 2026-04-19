import { randomUUID } from 'node:crypto';

export const INVOICE_KINDS = ['quote', 'invoice'] as const;
export type InvoiceKind = (typeof INVOICE_KINDS)[number];

export const INVOICE_STATUSES = [
  'draft',
  'sent',
  'accepted',
  'paid',
  'cancelled',
  'expired',
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type Invoice = {
  id: string;
  tenant_id: string;
  kind: InvoiceKind;
  number: string;
  contact_id: string | null;
  customer_name: string;
  customer_email: string | null;
  items: LineItem[];
  subtotal: number;
  tax_rate: number;
  tax: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  notes: string | null;
  /** ISO; for quotes this is the validity expiry, for invoices the due date. */
  due_at: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceInput = {
  kind: InvoiceKind;
  customerName: string;
  items: LineItem[];
  contactId?: string | null;
  customerEmail?: string | null;
  taxRate?: number;
  currency?: string;
  notes?: string | null;
  dueAt?: string | null;
  number?: string;
};

export type InvoicePatch = Partial<{
  customerName: string;
  customerEmail: string | null;
  contactId: string | null;
  items: LineItem[];
  taxRate: number;
  currency: string;
  notes: string | null;
  dueAt: string | null;
  status: InvoiceStatus;
  pdfUrl: string | null;
}>;

function nowIso(): string {
  return new Date().toISOString();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function computeTotals(
  items: LineItem[],
  taxRate: number,
): { subtotal: number; tax: number; total: number } {
  const subtotal = round2(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0));
  const tax = round2(subtotal * taxRate);
  const total = round2(subtotal + tax);
  return { subtotal, tax, total };
}

function validateItems(items: LineItem[]): void {
  if (!Array.isArray(items) || items.length === 0) throw new Error('invalid_items');
  for (const i of items) {
    if (typeof i.description !== 'string' || i.description.trim().length === 0) {
      throw new Error('invalid_items');
    }
    if (!Number.isFinite(i.quantity) || i.quantity <= 0 || i.quantity > 100_000) {
      throw new Error('invalid_items');
    }
    if (!Number.isFinite(i.unitPrice) || i.unitPrice < 0 || i.unitPrice > 1_000_000_000) {
      throw new Error('invalid_items');
    }
  }
}

function nextNumber(existing: Iterable<Invoice>, kind: InvoiceKind, year: number): string {
  const prefix = kind === 'quote' ? 'COT' : 'FAC';
  const yearStr = String(year);
  let max = 0;
  for (const inv of existing) {
    if (inv.kind !== kind) continue;
    const m = inv.number.match(new RegExp(`^${prefix}-${yearStr}-(\\d+)$`));
    if (m && m[1]) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return `${prefix}-${yearStr}-${String(max + 1).padStart(4, '0')}`;
}

export type InvoicesStore = {
  list(tenantId: string, opts?: { kind?: InvoiceKind; status?: InvoiceStatus }): Promise<Invoice[]>;
  get(tenantId: string, id: string): Promise<Invoice | null>;
  create(tenantId: string, input: InvoiceInput): Promise<Invoice>;
  update(tenantId: string, id: string, patch: InvoicePatch): Promise<Invoice | null>;
  remove(tenantId: string, id: string): Promise<boolean>;
  count(tenantId: string): Promise<number>;
};

export function createMemoryInvoicesStore(): InvoicesStore {
  const byTenant = new Map<string, Map<string, Invoice>>();

  function bucket(tenantId: string): Map<string, Invoice> {
    let b = byTenant.get(tenantId);
    if (!b) {
      b = new Map();
      byTenant.set(tenantId, b);
    }
    return b;
  }

  return {
    async list(tenantId, opts) {
      const all = Array.from(bucket(tenantId).values()).sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      );
      let out = all;
      if (opts?.kind) out = out.filter((i) => i.kind === opts.kind);
      if (opts?.status) out = out.filter((i) => i.status === opts.status);
      return out;
    },

    async get(tenantId, id) {
      return bucket(tenantId).get(id) ?? null;
    },

    async create(tenantId, input) {
      const customerName = input.customerName.trim();
      if (customerName.length < 1 || customerName.length > 200) {
        throw new Error('invalid_customer');
      }
      validateItems(input.items);
      const taxRate = input.taxRate ?? 0;
      if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 1) {
        throw new Error('invalid_tax_rate');
      }

      const totals = computeTotals(input.items, taxRate);
      const year = new Date().getUTCFullYear();
      const number = input.number?.trim() || nextNumber(bucket(tenantId).values(), input.kind, year);
      for (const inv of bucket(tenantId).values()) {
        if (inv.number === number) throw new Error('number_taken');
      }

      const inv: Invoice = {
        id: randomUUID(),
        tenant_id: tenantId,
        kind: input.kind,
        number,
        contact_id: input.contactId ?? null,
        customer_name: customerName,
        customer_email: input.customerEmail?.trim() || null,
        items: input.items.map((i) => ({
          description: i.description.trim(),
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        subtotal: totals.subtotal,
        tax_rate: taxRate,
        tax: totals.tax,
        total: totals.total,
        currency: (input.currency ?? 'USD').toUpperCase(),
        status: 'draft',
        notes: input.notes?.trim() || null,
        due_at: input.dueAt ?? null,
        pdf_url: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      bucket(tenantId).set(inv.id, inv);
      return inv;
    },

    async update(tenantId, id, patch) {
      const existing = bucket(tenantId).get(id);
      if (!existing) return null;

      let items = existing.items;
      let taxRate = existing.tax_rate;
      if (patch.items !== undefined) {
        validateItems(patch.items);
        items = patch.items.map((i) => ({
          description: i.description.trim(),
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        }));
      }
      if (patch.taxRate !== undefined) {
        if (!Number.isFinite(patch.taxRate) || patch.taxRate < 0 || patch.taxRate > 1) {
          throw new Error('invalid_tax_rate');
        }
        taxRate = patch.taxRate;
      }
      const totals =
        patch.items !== undefined || patch.taxRate !== undefined
          ? computeTotals(items, taxRate)
          : { subtotal: existing.subtotal, tax: existing.tax, total: existing.total };

      const updated: Invoice = {
        ...existing,
        ...(patch.customerName !== undefined ? { customer_name: patch.customerName.trim() } : {}),
        ...(patch.customerEmail !== undefined
          ? { customer_email: patch.customerEmail?.trim() || null }
          : {}),
        ...(patch.contactId !== undefined ? { contact_id: patch.contactId } : {}),
        items,
        tax_rate: taxRate,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        ...(patch.currency !== undefined ? { currency: patch.currency.toUpperCase() } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes?.trim() || null } : {}),
        ...(patch.dueAt !== undefined ? { due_at: patch.dueAt } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.pdfUrl !== undefined ? { pdf_url: patch.pdfUrl } : {}),
        updated_at: nowIso(),
      };
      bucket(tenantId).set(id, updated);
      return updated;
    },

    async remove(tenantId, id) {
      return bucket(tenantId).delete(id);
    },

    async count(tenantId) {
      return bucket(tenantId).size;
    },
  };
}
