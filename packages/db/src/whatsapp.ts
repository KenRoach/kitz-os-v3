import { randomUUID } from 'node:crypto';
import { WHATSAPP_STATUSES, type WhatsAppStatus } from './whatsapp-statuses';

export { WHATSAPP_STATUSES };
export type { WhatsAppStatus };

export type WhatsAppSession = {
  id: string;
  tenant_id: string;
  phone: string | null;
  status: WhatsAppStatus;
  /** Data URL (image/png) for the active QR, present only in awaiting_scan. */
  qr_data_url: string | null;
  qr_expires_at: string | null;
  last_error: string | null;
  connected_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WhatsAppSessionPatch = Partial<{
  phone: string | null;
  status: WhatsAppStatus;
  qr_data_url: string | null;
  qr_expires_at: string | null;
  last_error: string | null;
  connected_at: string | null;
}>;

function nowIso(): string {
  return new Date().toISOString();
}

export type WhatsAppStore = {
  /** Get the (single) session for a tenant. */
  get(tenantId: string): Promise<WhatsAppSession | null>;
  /** Idempotently create an idle session for a tenant if none exists. */
  ensure(tenantId: string): Promise<WhatsAppSession>;
  update(tenantId: string, patch: WhatsAppSessionPatch): Promise<WhatsAppSession | null>;
  remove(tenantId: string): Promise<boolean>;
  countConnected(tenantId: string): Promise<number>;
};

export function createMemoryWhatsAppStore(): WhatsAppStore {
  const byTenant = new Map<string, WhatsAppSession>();

  return {
    async get(tenantId) {
      return byTenant.get(tenantId) ?? null;
    },

    async ensure(tenantId) {
      const existing = byTenant.get(tenantId);
      if (existing) return existing;
      const row: WhatsAppSession = {
        id: randomUUID(),
        tenant_id: tenantId,
        phone: null,
        status: 'idle',
        qr_data_url: null,
        qr_expires_at: null,
        last_error: null,
        connected_at: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      byTenant.set(tenantId, row);
      return row;
    },

    async update(tenantId, patch) {
      const existing = byTenant.get(tenantId);
      if (!existing) return null;
      const updated: WhatsAppSession = {
        ...existing,
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.qr_data_url !== undefined ? { qr_data_url: patch.qr_data_url } : {}),
        ...(patch.qr_expires_at !== undefined ? { qr_expires_at: patch.qr_expires_at } : {}),
        ...(patch.last_error !== undefined ? { last_error: patch.last_error } : {}),
        ...(patch.connected_at !== undefined ? { connected_at: patch.connected_at } : {}),
        updated_at: nowIso(),
      };
      byTenant.set(tenantId, updated);
      return updated;
    },

    async remove(tenantId) {
      return byTenant.delete(tenantId);
    },

    async countConnected(tenantId) {
      const existing = byTenant.get(tenantId);
      return existing && existing.status === 'connected' ? 1 : 0;
    },
  };
}
