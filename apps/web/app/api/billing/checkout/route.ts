import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiEnvelope } from '@kitz/types';
import { BILLING_PLANS } from '@kitz/db/billing-plans';
import { requireTenant } from '@/lib/auth/require-tenant';
import { getBillingProvider } from '@/lib/billing/provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const planSchema = z.object({
  type: z.literal('plan'),
  plan: z.enum(BILLING_PLANS),
});

const topupSchema = z.object({
  type: z.literal('topup'),
  packId: z.string().trim().min(1).max(40),
});

const inputSchema = z.discriminatedUnion('type', [planSchema, topupSchema]);

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

  let parsed: z.infer<typeof inputSchema>;
  try {
    parsed = inputSchema.parse(await request.json());
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'invalid_body' };
    return NextResponse.json(body, { status: 400 });
  }

  const provider = getBillingProvider();
  const successPath = '/workspace/ajustes/facturacion?success=1';
  const cancelPath = '/workspace/ajustes/facturacion?cancelled=1';

  try {
    const session = await provider.createCheckout(
      parsed.type === 'plan'
        ? {
            type: 'plan',
            plan: parsed.plan,
            tenantId: auth.ctx.tenantId,
            successPath,
            cancelPath,
          }
        : {
            type: 'topup',
            packId: parsed.packId,
            tenantId: auth.ctx.tenantId,
            successPath,
            cancelPath,
          },
    );
    const body: ApiEnvelope<{ url: string; sessionId: string }> = {
      success: true,
      data: { url: session.url, sessionId: session.id },
      error: null,
    };
    return NextResponse.json(body, { status: 201 });
  } catch (err) {
    const reason =
      err instanceof Error && /invalid_/.test(err.message) ? err.message : 'checkout_failed';
    const body: ApiEnvelope<null> = { success: false, data: null, error: reason };
    return NextResponse.json(body, { status: 400 });
  }
}
