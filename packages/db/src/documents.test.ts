import { describe, it, expect } from 'vitest';
import { createMemoryDocumentsStore } from './documents';

const T = 't-1';
const OTHER = 't-2';

const baseInput = {
  kind: 'receipt' as const,
  filename: 'recibo-001.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 12_345,
  storageKey: 'tenants/t-1/recibo-001.pdf',
  uploadedBy: 'user-1',
};

describe('documents store', () => {
  it('creates a document with normalized fields and uploaded status', async () => {
    const s = createMemoryDocumentsStore();
    const doc = await s.create(T, { ...baseInput, notes: '  algo  ' });
    expect(doc.kind).toBe('receipt');
    expect(doc.status).toBe('uploaded');
    expect(doc.filename).toBe('recibo-001.pdf');
    expect(doc.notes).toBe('algo');
    expect(doc.size_bytes).toBe(12_345);
    expect(doc.extracted_data).toBeNull();
  });

  it('rejects empty filename, mime, storage key, uploader', async () => {
    const s = createMemoryDocumentsStore();
    await expect(s.create(T, { ...baseInput, filename: '   ' })).rejects.toThrow(
      'invalid_filename',
    );
    await expect(s.create(T, { ...baseInput, mimeType: '' })).rejects.toThrow('invalid_mime');
    await expect(s.create(T, { ...baseInput, storageKey: '' })).rejects.toThrow(
      'invalid_storage_key',
    );
    await expect(s.create(T, { ...baseInput, uploadedBy: '' })).rejects.toThrow(
      'invalid_uploader',
    );
  });

  it('rejects bad sizes', async () => {
    const s = createMemoryDocumentsStore();
    await expect(s.create(T, { ...baseInput, sizeBytes: 0 })).rejects.toThrow('invalid_size');
    await expect(s.create(T, { ...baseInput, sizeBytes: -1 })).rejects.toThrow('invalid_size');
    await expect(
      s.create(T, { ...baseInput, sizeBytes: 100 * 1024 * 1024 }),
    ).rejects.toThrow('invalid_size');
  });

  it('list filters by kind and status', async () => {
    const s = createMemoryDocumentsStore();
    const a = await s.create(T, { ...baseInput, kind: 'receipt' });
    await s.create(T, { ...baseInput, kind: 'invoice', filename: 'fac.pdf' });
    await s.create(T, { ...baseInput, kind: 'id_card', filename: 'id.png' });
    await s.update(T, a.id, { status: 'extracted', extractedData: { total: 100 } });
    expect((await s.list(T, { kind: 'receipt' })).length).toBe(1);
    expect((await s.list(T, { kind: 'invoice' })).length).toBe(1);
    expect((await s.list(T, { status: 'extracted' })).length).toBe(1);
    expect((await s.list(T, { status: 'uploaded' })).length).toBe(2);
  });

  it('update applies status transitions and extracted_data', async () => {
    const s = createMemoryDocumentsStore();
    const doc = await s.create(T, baseInput);
    const ex = await s.update(T, doc.id, {
      status: 'extracting',
    });
    expect(ex?.status).toBe('extracting');
    const done = await s.update(T, doc.id, {
      status: 'extracted',
      extractedData: { total: 42, currency: 'USD' },
    });
    expect(done?.status).toBe('extracted');
    expect(done?.extracted_data).toEqual({ total: 42, currency: 'USD' });
  });

  it('update can record an extract failure', async () => {
    const s = createMemoryDocumentsStore();
    const doc = await s.create(T, baseInput);
    const failed = await s.update(T, doc.id, {
      status: 'failed',
      extractError: 'unreadable_image',
    });
    expect(failed?.status).toBe('failed');
    expect(failed?.extract_error).toBe('unreadable_image');
  });

  it('isolates per tenant', async () => {
    const s = createMemoryDocumentsStore();
    await s.create(T, baseInput);
    await s.create(OTHER, { ...baseInput, filename: 'other.pdf' });
    expect(await s.count(T)).toBe(1);
    expect(await s.count(OTHER)).toBe(1);
  });

  it('remove returns false for missing', async () => {
    const s = createMemoryDocumentsStore();
    const doc = await s.create(T, baseInput);
    expect(await s.remove(T, doc.id)).toBe(true);
    expect(await s.remove(T, 'missing')).toBe(false);
  });

  it('rejects oversized notes on patch', async () => {
    const s = createMemoryDocumentsStore();
    const doc = await s.create(T, baseInput);
    await expect(s.update(T, doc.id, { notes: 'a'.repeat(2000) })).rejects.toThrow(
      'invalid_notes',
    );
  });
});
