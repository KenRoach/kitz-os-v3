/**
 * User preferences API — vibe, voice, language.
 *
 * GET  /api/prefs              → { vibe, voice, lang } | null per kind
 * POST /api/prefs { kind, value } → upsert one pref + SSE broadcast
 *
 * Why one route for three prefs: they're all small strings, all
 * scoped the same way, all written from the same UI surfaces. A
 * single route keeps the client side short.
 *
 * Cross-device sync: every upsert emits a `vibe.changed` event on
 * the tenant bus (we only currently have a dedicated event kind for
 * vibe; voice + lang ride the same channel as generic pref updates
 * via the broadcast — both shells re-fetch on any pref event).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiEnvelope } from '@kitz/types';
import { requireTenant } from '@/lib/auth/require-tenant';
import { prefsStore, type PrefKind } from '@/lib/prefs/store';
import { eventBus } from '@/lib/stream/bus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PREF_KINDS = ['vibe', 'voice', 'lang'] as const;

const postSchema = z.object({
  kind: z.enum(PREF_KINDS),
  value: z.string().trim().min(1).max(120),
  fromDevice: z.enum(['desktop', 'mobile']).default('desktop'),
});

export type PrefsPayload = Partial<Record<PrefKind, string>>;

export async function GET(): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }

  const rows = prefsStore.listForUser(auth.ctx.tenantId, auth.ctx.userId);
  const payload: PrefsPayload = {};
  for (const r of rows) payload[r.kind] = r.value;

  const body: ApiEnvelope<PrefsPayload> = { success: true, data: payload, error: null };
  return NextResponse.json(body, { status: 200 });
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }

  let parsed: z.infer<typeof postSchema>;
  try {
    parsed = postSchema.parse(await request.json());
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'invalid_body' };
    return NextResponse.json(body, { status: 400 });
  }

  prefsStore.set(auth.ctx.tenantId, auth.ctx.userId, parsed.kind, parsed.value);

  // Broadcast a vibe.changed event so the other device's Vibe picker
  // updates immediately. Voice + lang changes ride through as the
  // same event kind — both shells react by re-fetching /api/prefs.
  if (parsed.kind === 'vibe') {
    eventBus.emit(auth.ctx.tenantId, {
      kind: 'vibe.changed',
      vibe: parsed.value,
      fromDevice: parsed.fromDevice,
      at: new Date().toISOString(),
    });
  }

  const body: ApiEnvelope<{ ok: true }> = {
    success: true,
    data: { ok: true },
    error: null,
  };
  return NextResponse.json(body, { status: 200 });
}
