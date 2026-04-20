import type { Client } from '../client';
import type { Metrics } from '../metrics';
import { type TopupPackId } from '../config';

type CheckoutResp = {
  success: boolean;
  data: { url: string; sessionId: string } | null;
  error: string | null;
};
type ConfirmResp = {
  success: boolean;
  data: { applied: boolean } | null;
  error: string | null;
};

export type TopupResult =
  | { ok: true; packId: TopupPackId; sessionId: string }
  | { ok: false; reason: string };

/**
 * Drive a single topup purchase end-to-end. Same checkout/confirm pair
 * as upgrade.ts but with type:'topup'.
 */
export async function buyTopup(opts: {
  client: Client;
  metrics: Metrics;
  licenseId: string;
  packId: TopupPackId;
}): Promise<TopupResult> {
  const { client, metrics, licenseId, packId } = opts;
  const checkout = await client.request<CheckoutResp>('POST', '/api/billing/checkout', {
    type: 'topup',
    packId,
  });
  if (!checkout.ok || !checkout.body?.success || !checkout.body.data) {
    return { ok: false, reason: checkout.body?.error ?? `http_${checkout.status}` };
  }
  const sessionId = checkout.body.data.sessionId;
  const confirm = await client.request<ConfirmResp>('POST', '/api/billing/confirm', {
    sessionId,
  });
  if (!confirm.ok || !confirm.body?.success) {
    return { ok: false, reason: confirm.body?.error ?? `http_${confirm.status}` };
  }
  metrics.recordEvent(licenseId, 'topup_purchased');
  return { ok: true, packId, sessionId };
}
