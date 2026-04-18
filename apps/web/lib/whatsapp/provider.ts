/**
 * WhatsApp provider abstraction.
 *
 * Real implementation is Baileys (ai-runtime owns the socket lifecycle).
 * The stub here is used in dev + tests: it produces a deterministic QR
 * payload and simulates the transition to connected after a short wait.
 */

export type WhatsAppProvider = {
  /** Start a session. Returns QR data URL + expiry. */
  requestQr(tenantId: string): Promise<{
    qrDataUrl: string;
    expiresAt: string;
  }>;
  /** Simulate successful scan (stub only; Baileys emits this via socket). */
  simulateScan(tenantId: string): Promise<{ phone: string }>;
  /** Tear down the session. */
  disconnect(tenantId: string): Promise<void>;
};

/**
 * A tiny solid-gray 8×8 PNG encoded as a data URL. Real QR bytes come from
 * Baileys later. Using a stable payload keeps the UI deterministic during
 * development without pulling in a QR generator dependency.
 */
const STUB_QR_DATA_URL =
  'data:image/png;base64,' +
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAF0lEQVR42mP8//8/AyUYiCpg' +
  'FDAKGAUMAgBBWQUDuyWJIwAAAABJRU5ErkJggg==';

export function createStubWhatsAppProvider(): WhatsAppProvider {
  return {
    async requestQr(_tenantId) {
      // 60-second QR lifetime matches Baileys' default pairing window
      return {
        qrDataUrl: STUB_QR_DATA_URL,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      };
    },

    async simulateScan(_tenantId) {
      return { phone: '+50760000000' };
    },

    async disconnect(_tenantId) {
      /* noop for the stub */
    },
  };
}
