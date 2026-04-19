import { describe, it, expect } from 'vitest';
import { createMemoryInvoicesStore } from './invoices';

const T = 't-1';
const OTHER = 't-2';

const baseItems = [
  { description: 'Item A', quantity: 2, unitPrice: 50 },
  { description: 'Item B', quantity: 1, unitPrice: 100 },
];

describe('invoices store', () => {
  it('creates a quote with computed totals and auto-number', async () => {
    const store = createMemoryInvoicesStore();
    const inv = await store.create(T, {
      kind: 'quote',
      customerName: '  Acme  ',
      items: baseItems,
      taxRate: 0.07,
    });
    expect(inv.kind).toBe('quote');
    expect(inv.customer_name).toBe('Acme');
    expect(inv.subtotal).toBe(200);
    expect(inv.tax).toBe(14);
    expect(inv.total).toBe(214);
    expect(inv.status).toBe('draft');
    expect(inv.currency).toBe('USD');
    expect(inv.number).toMatch(/^COT-\d{4}-0001$/);
  });

  it('uses FAC prefix and increments number per kind', async () => {
    const store = createMemoryInvoicesStore();
    const a = await store.create(T, { kind: 'invoice', customerName: 'X', items: baseItems });
    const b = await store.create(T, { kind: 'invoice', customerName: 'Y', items: baseItems });
    const c = await store.create(T, { kind: 'quote', customerName: 'Z', items: baseItems });
    expect(a.number).toMatch(/^FAC-\d{4}-0001$/);
    expect(b.number).toMatch(/^FAC-\d{4}-0002$/);
    expect(c.number).toMatch(/^COT-\d{4}-0001$/);
  });

  it('rejects empty items, bad quantities, bad prices', async () => {
    const store = createMemoryInvoicesStore();
    await expect(
      store.create(T, { kind: 'quote', customerName: 'X', items: [] }),
    ).rejects.toThrow('invalid_items');
    await expect(
      store.create(T, {
        kind: 'quote',
        customerName: 'X',
        items: [{ description: 'A', quantity: 0, unitPrice: 5 }],
      }),
    ).rejects.toThrow('invalid_items');
    await expect(
      store.create(T, {
        kind: 'quote',
        customerName: 'X',
        items: [{ description: 'A', quantity: 1, unitPrice: -1 }],
      }),
    ).rejects.toThrow('invalid_items');
    await expect(
      store.create(T, {
        kind: 'quote',
        customerName: 'X',
        items: [{ description: '   ', quantity: 1, unitPrice: 5 }],
      }),
    ).rejects.toThrow('invalid_items');
  });

  it('rejects bad tax rate and bad customer', async () => {
    const store = createMemoryInvoicesStore();
    await expect(
      store.create(T, { kind: 'quote', customerName: 'X', items: baseItems, taxRate: 1.5 }),
    ).rejects.toThrow('invalid_tax_rate');
    await expect(
      store.create(T, { kind: 'quote', customerName: '   ', items: baseItems }),
    ).rejects.toThrow('invalid_customer');
  });

  it('rejects duplicate number', async () => {
    const store = createMemoryInvoicesStore();
    await store.create(T, {
      kind: 'invoice',
      customerName: 'X',
      items: baseItems,
      number: 'CUSTOM-001',
    });
    await expect(
      store.create(T, {
        kind: 'invoice',
        customerName: 'Y',
        items: baseItems,
        number: 'CUSTOM-001',
      }),
    ).rejects.toThrow('number_taken');
  });

  it('list filters by kind and status', async () => {
    const store = createMemoryInvoicesStore();
    const q = await store.create(T, { kind: 'quote', customerName: 'A', items: baseItems });
    await store.create(T, { kind: 'invoice', customerName: 'B', items: baseItems });
    await store.update(T, q.id, { status: 'sent' });
    expect((await store.list(T, { kind: 'quote' })).length).toBe(1);
    expect((await store.list(T, { kind: 'invoice' })).length).toBe(1);
    expect((await store.list(T, { status: 'sent' })).length).toBe(1);
    expect((await store.list(T, { status: 'draft' })).length).toBe(1);
  });

  it('update recomputes totals when items or tax change', async () => {
    const store = createMemoryInvoicesStore();
    const inv = await store.create(T, {
      kind: 'quote',
      customerName: 'X',
      items: baseItems,
      taxRate: 0.1,
    });
    expect(inv.total).toBe(220);
    const updated = await store.update(T, inv.id, {
      items: [{ description: 'New', quantity: 3, unitPrice: 100 }],
    });
    expect(updated?.subtotal).toBe(300);
    expect(updated?.total).toBe(330);
    const taxed = await store.update(T, inv.id, { taxRate: 0 });
    expect(taxed?.tax).toBe(0);
    expect(taxed?.total).toBe(300);
  });

  it('isolates per tenant', async () => {
    const store = createMemoryInvoicesStore();
    await store.create(T, { kind: 'quote', customerName: 'A', items: baseItems });
    await store.create(OTHER, { kind: 'quote', customerName: 'B', items: baseItems });
    expect(await store.count(T)).toBe(1);
    expect(await store.count(OTHER)).toBe(1);
  });

  it('remove returns false for missing', async () => {
    const store = createMemoryInvoicesStore();
    const inv = await store.create(T, { kind: 'quote', customerName: 'X', items: baseItems });
    expect(await store.remove(T, inv.id)).toBe(true);
    expect(await store.remove(T, 'missing')).toBe(false);
  });

  it('status transitions via update', async () => {
    const store = createMemoryInvoicesStore();
    const inv = await store.create(T, { kind: 'invoice', customerName: 'X', items: baseItems });
    expect(inv.status).toBe('draft');
    const sent = await store.update(T, inv.id, { status: 'sent' });
    expect(sent?.status).toBe('sent');
    const paid = await store.update(T, inv.id, { status: 'paid', pdfUrl: 'https://x/y.pdf' });
    expect(paid?.status).toBe('paid');
    expect(paid?.pdf_url).toBe('https://x/y.pdf');
  });

  it('uppercases currency', async () => {
    const store = createMemoryInvoicesStore();
    const inv = await store.create(T, {
      kind: 'quote',
      customerName: 'X',
      items: baseItems,
      currency: 'pab',
    });
    expect(inv.currency).toBe('PAB');
  });
});
