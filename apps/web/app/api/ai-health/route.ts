import { NextResponse } from 'next/server';
import { signServiceJwt } from '@kitz/config/jwt';
import type { ApiEnvelope } from '@kitz/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Proxies an authenticated healthcheck to ai-runtime.
 * Signs a short-lived service JWT with the caller's tenant_id (stubbed in Phase 1).
 */
export async function GET(): Promise<Response> {
  const secret = process.env.SERVICE_JWT_SECRET;
  const runtimeUrl = process.env.OS_RUNTIME_URL ?? 'http://localhost:5200';

  if (!secret) {
    const body: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: 'service_jwt_secret_not_configured',
    };
    return NextResponse.json(body, { status: 500 });
  }

  // Phase 1: stub tenant. Real tenant_id comes from Supabase session in Phase 1 module 2.
  const tenantId = 'phase1-stub-tenant';

  try {
    const token = await signServiceJwt(tenantId, secret);
    const upstream = await fetch(`${runtimeUrl}/health`, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    const data: unknown = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    const body: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: err instanceof Error ? err.message : 'ai_runtime_unreachable',
    };
    return NextResponse.json(body, { status: 502 });
  }
}
