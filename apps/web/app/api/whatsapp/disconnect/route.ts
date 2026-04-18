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
  await provider.disconnect(auth.ctx.tenantId);
  const updated = await db.whatsapp.update(auth.ctx.tenantId, {
    status: 'disconnected',
    qr_data_url: null,
    qr_expires_at: null,
  });
  if (!updated) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'not_found' };
    return NextResponse.json(body, { status: 404 });
  }
  await db.recordActivity({
    tenantId: auth.ctx.tenantId,
    actor: auth.ctx.userId,
    action: 'disconnected_whatsapp',
    entity: updated.phone ?? 'unknown',
  });
  const body: ApiEnvelope<WhatsAppSession | null> = {
    success: true,
    data: updated,
    error: null,
  };
  return NextResponse.json(body, { status: 200 });
}
