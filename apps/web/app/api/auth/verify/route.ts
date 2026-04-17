import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiEnvelope } from '@kitz/types';
import { getDb } from '@/lib/db';
import { verifyOtp } from '@/lib/auth/otp';
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  email: z.string().email().max(320),
  code: z.string().regex(/^\d{6}$/, 'code must be 6 digits'),
});

export async function POST(request: Request): Promise<Response> {
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'invalid_body' };
    return NextResponse.json(body, { status: 400 });
  }

  const db = getDb();
  const result = await verifyOtp(db, parsed.email, parsed.code);

  if (!result.ok) {
    const status = result.reason === 'too_many_attempts' ? 429 : 401;
    const body: ApiEnvelope<null> = { success: false, data: null, error: result.reason };
    return NextResponse.json(body, { status });
  }

  // First-login routing: no tenant yet → onboarding, else workspace
  const primary = await db.findPrimaryTenant(result.userId);
  const next = primary ? '/workspace' : '/onboarding';

  const isProd = process.env.NODE_ENV === 'production';
  const response = NextResponse.json<ApiEnvelope<{ userId: string; next: string }>>(
    { success: true, data: { userId: result.userId, next }, error: null },
    { status: 200 },
  );
  response.cookies.set(SESSION_COOKIE_NAME, result.token, sessionCookieOptions(isProd));
  return response;
}
