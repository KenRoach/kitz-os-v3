/**
 * Stripe-shaped billing provider with an in-process stub.
 *
 * The real Stripe implementation will land when STRIPE_SECRET_KEY is set
 * and a webhook handler is added. The stub returns synthetic IDs and a
 * playable hosted-checkout URL so the upgrade/topup flows are testable
 * end-to-end without leaving the browser.
 */

import { randomUUID } from 'node:crypto';
import { BILLING_PLAN_SPECS, type BillingPlan, findTopupPack } from '@kitz/db/billing-plans';

export type CheckoutSession = {
  id: string;
  url: string;
  /** Synthesised so the stub success route can resolve back to a tenant. */
  metadata: Record<string, string>;
};

export type CheckoutInput =
  | { type: 'plan'; plan: BillingPlan; tenantId: string; successPath: string; cancelPath: string }
  | {
      type: 'topup';
      packId: string;
      tenantId: string;
      successPath: string;
      cancelPath: string;
    };

export type ResolvedCheckout =
  | { kind: 'plan'; plan: BillingPlan; tenantId: string }
  | { kind: 'topup'; credits: number; packId: string; tenantId: string };

export type BillingProvider = {
  createCheckout(input: CheckoutInput): Promise<CheckoutSession>;
  /** Used by the dev-only success endpoint to apply the stub purchase. */
  resolveStubCheckout(sessionId: string): ResolvedCheckout | null;
};

export function createStubBillingProvider(): BillingProvider {
  // Sessions live in-memory for the lifetime of the dev server.
  const sessions = new Map<string, ResolvedCheckout>();

  function makeSession(resolved: ResolvedCheckout, successPath: string): CheckoutSession {
    const id = `cs_stub_${randomUUID()}`;
    sessions.set(id, resolved);
    const url = `${successPath}${successPath.includes('?') ? '&' : '?'}session_id=${id}`;
    return {
      id,
      url,
      metadata:
        resolved.kind === 'plan'
          ? { tenantId: resolved.tenantId, plan: resolved.plan }
          : {
              tenantId: resolved.tenantId,
              packId: resolved.packId,
              credits: String(resolved.credits),
            },
    };
  }

  return {
    async createCheckout(input) {
      if (input.type === 'plan') {
        const spec = BILLING_PLAN_SPECS[input.plan];
        if (!spec) throw new Error('invalid_plan');
        return makeSession(
          { kind: 'plan', plan: input.plan, tenantId: input.tenantId },
          input.successPath,
        );
      }
      const pack = findTopupPack(input.packId);
      if (!pack) throw new Error('invalid_pack');
      return makeSession(
        { kind: 'topup', credits: pack.credits, packId: pack.id, tenantId: input.tenantId },
        input.successPath,
      );
    },

    resolveStubCheckout(sessionId) {
      return sessions.get(sessionId) ?? null;
    },
  };
}

let cached: BillingProvider | null = null;

export function getBillingProvider(): BillingProvider {
  if (!cached) cached = createStubBillingProvider();
  return cached;
}
