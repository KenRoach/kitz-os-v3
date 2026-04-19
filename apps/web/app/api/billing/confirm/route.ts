/**
 * Stub-only checkout confirmation. In production this is replaced by a
 * Stripe webhook handler that resolves the session via the Stripe SDK.
 *
 * The success page calls this with the session_id returned by the stub
 * checkout, and we apply the resulting plan upgrade or topup. The handler
 * is idempotent: applying the same session twice still leaves the battery
 * with the correct grant because we record a stable `external_session_id`
 * in metadata and skip duplicates.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiEnvelope } from '@kitz/types';
import { getDb } from '@/lib/db';
import { requireTenant } from '@/lib/auth/require-tenant';
import { getBillingProvider } from '@/lib/billing/provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  sessionId: z.string().trim().min(8).max(120),
});

export async function POST(request: Request): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }
  if (auth.ctx.role !== 'owner' && auth.ctx.role !== 'admin') {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'forbidden' };
    return NextResponse.json(body, { status: 403 });
  }

  let parsed: z.infer<typeof schema>;
  try {
    parsed = schema.parse(await request.json());
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'invalid_body' };
    return NextResponse.json(body, { status: 400 });
  }

  const provider = getBillingProvider();
  const resolved = provider.resolveStubCheckout(parsed.sessionId);
  if (!resolved) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'session_not_found' };
    return NextResponse.json(body, { status: 404 });
  }
  if (resolved.tenantId !== auth.ctx.tenantId) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'tenant_mismatch' };
    return NextResponse.json(body, { status: 403 });
  }

  const db = getDb();
  // Idempotency guard: if the most recent ledger entry already references
  // this session, do nothing and return the current snapshot.
  const ledger = await db.billing.ledger(auth.ctx.tenantId, 25);
  const alreadyApplied = ledger.some(
    (e) => (e.metadata as Record<string, unknown> | null)?.sessionId === parsed.sessionId,
  );

  if (!alreadyApplied) {
    if (resolved.kind === 'plan') {
      await db.billing.setPlan(auth.ctx.tenantId, resolved.plan, {
        externalSubscriptionId: parsed.sessionId,
      });
      await db.recordActivity({
        tenantId: auth.ctx.tenantId,
        actor: auth.ctx.userId,
        action: 'changed_plan',
        entity: resolved.plan,
      });
    } else {
      await db.billing.topup(
        auth.ctx.tenantId,
        resolved.credits,
        `topup_${resolved.packId}`,
        { sessionId: parsed.sessionId, packId: resolved.packId },
      );
      await db.recordActivity({
        tenantId: auth.ctx.tenantId,
        actor: auth.ctx.userId,
        action: 'topup_battery',
        entity: `${resolved.credits} cr`,
      });
    }
  }

  const [subscription, battery] = await Promise.all([
    db.billing.getSubscription(auth.ctx.tenantId),
    db.billing.getBattery(auth.ctx.tenantId),
  ]);
  const body: ApiEnvelope<{
    applied: boolean;
    subscription: typeof subscription;
    battery: typeof battery;
  }> = {
    success: true,
    data: { applied: !alreadyApplied, subscription, battery },
    error: null,
  };
  return NextResponse.json(body, { status: 200 });
}
