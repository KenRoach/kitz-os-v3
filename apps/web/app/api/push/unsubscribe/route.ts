/**
 * POST /api/push/unsubscribe — remove a Web Push subscription.
 *
 * Called when the user revokes notification permission from the
 * browser, uninstalls the PWA, or explicitly turns alerts off inside
 * KitZ. Idempotent: quietly no-ops if the endpoint isn't registered.
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

  pushStore.remove(auth.ctx.tenantId, parsed.endpoint);

  const body: ApiEnvelope<{ ok: true }> = {
    success: true,
    data: { ok: true },
    error: null,
  };
  return NextResponse.json(body, { status: 200 });
}
