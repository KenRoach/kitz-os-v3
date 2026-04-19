/**
 * Pure constants for the documents/OCR module. Importable by client UI.
 */

export const DOCUMENT_KINDS = [
  'id_card',
  'receipt',
  'invoice',
  'contract',
  'other',
] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const DOCUMENT_STATUSES = [
  'uploaded',
  'extracting',
  'extracted',
  'failed',
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  id_card: 'Identificación',
  receipt: 'Recibo',
  invoice: 'Factura',
  contract: 'Contrato',
  other: 'Otro',
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  uploaded: 'Subido',
  extracting: 'Procesando',
  extracted: 'Extraído',
  failed: 'Falló',
};
