import { NextResponse } from 'next/server';
import type { ApiEnvelope } from '@kitz/types';
import type { BatteryLedgerEntry, BatteryState, BillingSubscription } from '@kitz/db';
import { getDb } from '@/lib/db';
import { requireTenant } from '@/lib/auth/require-tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type BillingSnapshot = {
  subscription: BillingSubscription;
  battery: BatteryState;
  ledger: BatteryLedgerEntry[];
};

export async function GET(): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }
  const db = getDb();
  const [subscription, battery, ledger] = await Promise.all([
    db.billing.getSubscription(auth.ctx.tenantId),
    db.billing.getBattery(auth.ctx.tenantId),
    db.billing.ledger(auth.ctx.tenantId, 25),
  ]);
  const body: ApiEnvelope<BillingSnapshot> = {
    success: true,
    data: { subscription, battery, ledger },
    error: null,
  };
  return NextResponse.json(body, { status: 200 });
}
