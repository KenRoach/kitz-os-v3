import { NextResponse } from 'next/server';
import type { ApiEnvelope } from '@kitz/types';
import { TOOLS, type ToolDef } from '@kitz/agents';
import { requireTenant } from '@/lib/auth/require-tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }

  const body: ApiEnvelope<{ tools: ToolDef[] }> = {
    success: true,
    data: { tools: [...TOOLS] },
    error: null,
  };
  return NextResponse.json(body, { status: 200 });
}
