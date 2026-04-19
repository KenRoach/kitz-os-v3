/**
 * Pure constants + types for invoices.
 * Separate file so client code can import without node:crypto.
 */

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

export const INVOICE_KIND_LABELS: Record<InvoiceKind, string> = {
  quote: 'Cotización',
  invoice: 'Factura',
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  accepted: 'Aceptada',
  paid: 'Pagada',
  cancelled: 'Cancelada',
  expired: 'Expirada',
};
