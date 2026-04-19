/**
 * OCR/extract provider with an in-process stub.
 *
 * The real implementation will call out to a vision model (Claude vision,
 * Tesseract, or a managed Document AI). Until then this stub returns
 * deterministic synthetic fields per document kind so the upload → extract
 * → display loop is fully testable end-to-end without external services.
 */

import type { DocumentKind } from '@kitz/db/document-kinds';

export type ExtractInput = {
  kind: DocumentKind;
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

export type ExtractResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

export type OcrProvider = {
  extract(input: ExtractInput): Promise<ExtractResult>;
};

function syntheticReceipt(filename: string): Record<string, unknown> {
  return {
    merchant: 'Comercial Demo S.A.',
    date: new Date().toISOString().slice(0, 10),
    total: 42.5,
    currency: 'USD',
    tax: 2.98,
    items: [
      { description: 'Producto A', quantity: 1, unitPrice: 30 },
      { description: 'Producto B', quantity: 2, unitPrice: 5.25 },
    ],
    source: filename,
  };
}

function syntheticInvoice(filename: string): Record<string, unknown> {
  return {
    issuer: 'Proveedor Demo S.R.L.',
    issuer_tax_id: 'RUC-1234567890',
    invoice_number: 'FAC-2026-00045',
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    subtotal: 850,
    tax: 59.5,
    total: 909.5,
    currency: 'USD',
    source: filename,
  };
}

function syntheticIdCard(filename: string): Record<string, unknown> {
  return {
    full_name: 'Juan Pérez Demo',
    document_number: '8-XXX-1234',
    nationality: 'PA',
    birth_date: '1990-05-12',
    expiration_date: '2032-05-12',
    source: filename,
  };
}

function syntheticContract(filename: string): Record<string, unknown> {
  return {
    parties: ['KitZ Demo S.A.', 'Cliente Demo S.R.L.'],
    effective_date: new Date().toISOString().slice(0, 10),
    term_months: 12,
    auto_renew: true,
    governing_law: 'PA',
    source: filename,
  };
}

function syntheticOther(filename: string, sizeBytes: number): Record<string, unknown> {
  return {
    text_preview: `Documento ${filename} (${sizeBytes} bytes). Stub OCR sin estructura.`,
    detected_language: 'es',
  };
}

export function createStubOcrProvider(): OcrProvider {
  return {
    async extract(input) {
      // Reject obviously non-image/pdf payloads to mimic provider validation.
      const okMime =
        input.mimeType.startsWith('image/') ||
        input.mimeType === 'application/pdf' ||
        input.mimeType === 'application/octet-stream';
      if (!okMime) {
        return { ok: false, error: 'unsupported_mime' };
      }

      // Simulate occasional failures for very tiny payloads.
      if (input.sizeBytes < 100) {
        return { ok: false, error: 'unreadable' };
      }

      switch (input.kind) {
        case 'receipt':
          return { ok: true, data: syntheticReceipt(input.filename) };
        case 'invoice':
          return { ok: true, data: syntheticInvoice(input.filename) };
        case 'id_card':
          return { ok: true, data: syntheticIdCard(input.filename) };
        case 'contract':
          return { ok: true, data: syntheticContract(input.filename) };
        case 'other':
        default:
          return { ok: true, data: syntheticOther(input.filename, input.sizeBytes) };
      }
    },
  };
}

let cached: OcrProvider | null = null;

export function getOcrProvider(): OcrProvider {
  if (!cached) cached = createStubOcrProvider();
  return cached;
}
