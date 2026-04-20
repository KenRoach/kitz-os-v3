/**
 * POST /api/whatsapp/simulate-message — dev-only helper that fakes an
 * inbound WhatsApp message so we can drive the SSE → AlertLayer →
 * toast path end-to-end without needing a real phone connected to
 * Baileys.
 *
 * This is the contract the real Baileys handler will also use when
 * it lands: call `eventBus.emit(tenantId, {kind:'whatsapp.message'})`
 * and both desktop + mobile shells will pop a toast automatically.
 *
 * Gated on `NODE_ENV !== 'production' || WHATSAPP_ALLOW_SIMULATE=1`
 * so prod deployments can't spoof messages via this endpoint.
 *
 * Body: { from?: string; preview?: string } — both optional; defaults
 * produce a plausible demo message so curl/Postman calls work with
 * no body at all.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiEnvelope } from '@kitz/types';
import { requireTenant } from '@/lib/auth/require-tenant';
import { eventBus } from '@/lib/stream/bus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z
  .object({
    from: z.string().trim().min(1).max(80).optional(),
    preview: z.string().trim().min(1).max(500).optional(),
  })
  .default({});

export async function POST(request: Request): Promise<Response> {
  const allow =
    process.env.NODE_ENV !== 'production' || process.env.WHATSAPP_ALLOW_SIMULATE === '1';
  if (!allow) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'not_allowed' };
    return NextResponse.json(body, { status: 403 });
  }

  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    const raw = (await request.json().catch(() => ({}))) as unknown;
    parsed = bodySchema.parse(raw);
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'invalid_body' };
    return NextResponse.json(body, { status: 400 });
  }

  const from = parsed.from ?? 'Cliente demo';
  const preview = parsed.preview ?? 'Hola, quiero cotizar 200 pcs.';
  const messageId = `wa_sim_${Date.now()}`;
  const at = new Date().toISOString();

  eventBus.emit(auth.ctx.tenantId, {
    kind: 'whatsapp.message',
    from,
    preview,
    messageId,
    at,
  });

  const body: ApiEnvelope<{ messageId: string }> = {
    success: true,
    data: { messageId },
    error: null,
  };
  return NextResponse.json(body, { status: 200 });
}
