import { NextResponse } from 'next/server';
import type { ApiEnvelope } from '@kitz/types';
import type { WhatsAppSession } from '@kitz/db';
import { getDb } from '@/lib/db';
import { requireTenant } from '@/lib/auth/require-tenant';
import { createStubWhatsAppProvider } from '@/lib/whatsapp/provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const provider = createStubWhatsAppProvider();

/**
 * Dev-only helper: simulates a successful QR scan to transition
 * awaiting_scan → connected without needing a real phone.
 *
 * Disabled when WHATSAPP_ALLOW_SIMULATE is not set (e.g. production).
 */
export async function POST(): Promise<Response> {
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
  if (auth.ctx.role === 'viewer') {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'forbidden' };
    return NextResponse.json(body, { status: 403 });
  }

  const db = getDb();
  const current = await db.whatsapp.get(auth.ctx.tenantId);
  if (!current || current.status !== 'awaiting_scan') {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'not_awaiting_scan' };
    return NextResponse.json(body, { status: 409 });
  }

  const { phone } = await provider.simulateScan(auth.ctx.tenantId);
  const updated = await db.whatsapp.update(auth.ctx.tenantId, {
    status: 'connected',
    phone,
    qr_data_url: null,
    qr_expires_at: null,
    connected_at: new Date().toISOString(),
  });
  await db.recordActivity({
    tenantId: auth.ctx.tenantId,
    actor: auth.ctx.userId,
    action: 'connected_whatsapp',
    entity: phone,
  });

  const body: ApiEnvelope<WhatsAppSession | null> = {
    success: true,
    data: updated,
    error: null,
  };
  return NextResponse.json(body, { status: 200 });
}
