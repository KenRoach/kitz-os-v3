/**
 * Pure constants + types for the WhatsApp session lifecycle.
 * Separate file so client code can import without node:crypto.
 */

export const WHATSAPP_STATUSES = [
  'idle',
  'requesting_qr',
  'awaiting_scan',
  'connected',
  'disconnected',
  'error',
] as const;
export type WhatsAppStatus = (typeof WHATSAPP_STATUSES)[number];

export const WHATSAPP_STATUS_LABELS: Record<WhatsAppStatus, string> = {
  idle: 'Sin conectar',
  requesting_qr: 'Generando QR…',
  awaiting_scan: 'Escanea el QR',
  connected: 'Conectado',
  disconnected: 'Desconectado',
  error: 'Error',
};
