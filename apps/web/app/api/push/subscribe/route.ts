/**
 * POST /api/push/subscribe — register a Web Push subscription for
 * the current tenant.
 *
 * The browser produces the subscription via PushManager.subscribe()
 * after the service worker is registered and the user has granted
 * notification permission. The client POSTs the subscription JSON
 * here; we stash it in the per-tenant push store so future emits on
 * this tenant can reach the user even when the tab is closed.
 *
 * Body: { endpoint, keys: { p256dh, auth }, device: 'desktop'|'mobile' }
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiEnvelope } from '@kitz/types';
import { requireTenant } from '@/lib/auth/require-tenant';
import { pushStore } from '@/lib/push/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  endpoint: z.string().trim().url().max(2000),
  keys: z.object({
    p256dh: z.string().trim().min(1).max(500),
    auth: z.string().trim().min(1).max(500),
  }),
  device: z.enum(['desktop', 'mobile']).default('desktop'),
});

export async function POST(request: Request): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'invalid_body' };
    return NextResponse.json(body, { status: 400 });
  }

  pushStore.add(auth.ctx.tenantId, {
    endpoint: parsed.endpoint,
    keys: parsed.keys,
    device: parsed.device,
    createdAt: new Date().toISOString(),
  });

  const body: ApiEnvelope<{ ok: true }> = {
    success: true,
    data: { ok: true },
    error: null,
  };
  return NextResponse.json(body, { status: 200 });
}
