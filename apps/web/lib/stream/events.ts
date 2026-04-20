/**
 * KitzEvent — the typed event envelope broadcast on the per-tenant SSE
 * bus. Both desktop ShellChat and mobile ChatTab subscribe to
 * `/api/stream` and react to these. Keep this union tight — every new
 * event kind needs a consumer on both shells or it just adds noise.
 *
 * Design note: the envelope carries `tenantId` so the server can
 * reject cross-tenant leakage, but `tenantId` is stripped before the
 * client ever sees the payload (clients only ever listen on their own
 * tenant channel, so including it would be redundant + a security
 * footgun if a subscription is ever shared).
 */

export type WhatsAppMessageEvent = {
  kind: 'whatsapp.message';
  from: string;
  preview: string;
  messageId: string;
  at: string;
};

export type InvoicePaidEvent = {
  kind: 'invoice.paid';
  invoiceId: string;
  number: string;
  total: number;
  currency: string;
  at: string;
};

export type SetupProgressEvent = {
  kind: 'setup.progress';
  doneCount: number;
  total: number;
  at: string;
};

export type VibeChangedEvent = {
  kind: 'vibe.changed';
  vibe: string;
  fromDevice: 'mobile' | 'desktop';
  at: string;
};

export type ChatMessageEvent = {
  kind: 'chat.message';
  role: 'user' | 'assistant';
  preview: string;
  fromDevice: 'mobile' | 'desktop';
  at: string;
};

export type KitzEvent =
  | WhatsAppMessageEvent
  | InvoicePaidEvent
  | SetupProgressEvent
  | VibeChangedEvent
  | ChatMessageEvent;

export type KitzEventKind = KitzEvent['kind'];
