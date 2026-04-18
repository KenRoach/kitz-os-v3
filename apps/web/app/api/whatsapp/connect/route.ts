import { NextResponse } from 'next/server';
import type { ApiEnvelope } from '@kitz/types';
import type { WhatsAppSession } from '@kitz/db';
import { getDb } from '@/lib/db';
import { requireTenant } from '@/lib/auth/require-tenant';
import { createStubWhatsAppProvider } from '@/lib/whatsapp/provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const provider = createStubWhatsAppProvider();

export async function POST(): Promise<Response> {
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
  await db.whatsapp.ensure(auth.ctx.tenantId);
  await db.whatsapp.update(auth.ctx.tenantId, {
    status: 'requesting_qr',
    last_error: null,
  });

  try {
    const { qrDataUrl, expiresAt } = await provider.requestQr(auth.ctx.tenantId);
    const updated = await db.whatsapp.update(auth.ctx.tenantId, {
      status: 'awaiting_scan',
      qr_data_url: qrDataUrl,
      qr_expires_at: expiresAt,
    });
    const body: ApiEnvelope<WhatsAppSession | null> = {
      success: true,
      data: updated,
      error: null,
    };
    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    await db.whatsapp.update(auth.ctx.tenantId, {
      status: 'error',
      last_error: err instanceof Error ? err.message : 'qr_failed',
      qr_data_url: null,
      qr_expires_at: null,
    });
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'qr_failed' };
    return NextResponse.json(body, { status: 500 });
  }
}
