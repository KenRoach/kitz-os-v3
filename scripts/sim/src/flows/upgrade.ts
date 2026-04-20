import type { Client } from '../client';
import type { Metrics } from '../metrics';
import type { PlanId } from '../config';

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

/**
 * Drive the real Stripe-stub flow: POST /api/billing/checkout with
 * {type:'plan', plan} → grab sessionId → POST /api/billing/confirm.
 *
 * In the real app this round-trip happens via a Stripe Checkout
 * redirect; the stub provider keeps the session in-memory and
 * /confirm resolves it synchronously, which is why we can drive the
 * full upgrade end-to-end from a script.
 */
export async function upgradePlan(opts: {
  client: Client;
  metrics: Metrics;
  licenseId: string;
  plan: PlanId;
}): Promise<{ ok: boolean; reason?: string }> {
  const { client, metrics, licenseId, plan } = opts;
  if (plan === 'free') return { ok: true }; // nothing to upgrade

  const checkout = await client.request<CheckoutResp>('POST', '/api/billing/checkout', {
    type: 'plan',
    plan,
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
  metrics.recordEvent(licenseId, 'plan_upgraded');
  return { ok: true };
}
