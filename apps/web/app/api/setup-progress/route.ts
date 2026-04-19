import { NextResponse } from 'next/server';
import type { ApiEnvelope } from '@kitz/types';
import { getDb } from '@/lib/db';
import { requireTenant } from '@/lib/auth/require-tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type SetupMilestone = {
  id: 'add_contact' | 'activate_agent' | 'connect_whatsapp' | 'create_quote' | 'topup_battery';
  done: boolean;
};

export type SetupProgressPayload = {
  milestones: SetupMilestone[];
  doneCount: number;
  total: number;
};

const FREE_GRANT = 100;

export async function GET(): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }
  const db = getDb();
  const [contactCount, activeAgent, whatsappConnected, invoiceCount, battery] = await Promise.all([
    db.contacts.count(auth.ctx.tenantId),
    db.agents.getActive(auth.ctx.tenantId),
    db.whatsapp.countConnected(auth.ctx.tenantId),
    db.invoices.count(auth.ctx.tenantId),
    db.billing.getBattery(auth.ctx.tenantId),
  ]);

  const milestones: SetupMilestone[] = [
    { id: 'add_contact', done: contactCount > 0 },
    { id: 'activate_agent', done: !!activeAgent },
    { id: 'connect_whatsapp', done: whatsappConnected > 0 },
    { id: 'create_quote', done: invoiceCount > 0 },
    // Topup counts as anything beyond the seeded free grant.
    { id: 'topup_battery', done: battery.lifetime_topup > FREE_GRANT },
  ];

  const body: ApiEnvelope<SetupProgressPayload> = {
    success: true,
    data: {
      milestones,
      doneCount: milestones.filter((m) => m.done).length,
      total: milestones.length,
    },
    error: null,
  };
  return NextResponse.json(body, { status: 200 });
}
