import { NextResponse } from 'next/server';
import type { ApiEnvelope } from '@kitz/types';
import type { WhatsAppSession } from '@kitz/db';
import { getDb } from '@/lib/db';
import { requireTenant } from '@/lib/auth/require-tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }
  const db = getDb();
  const session = await db.whatsapp.ensure(auth.ctx.tenantId);
  const body: ApiEnvelope<WhatsAppSession> = {
    success: true,
    data: session,
    error: null,
  };
  return NextResponse.json(body, { status: 200 });
}
