import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiEnvelope } from '@kitz/types';
import { getDb } from '@/lib/db';
import { getAuthLimiter } from '@/lib/ratelimit';
import { issueOtp } from '@/lib/auth/otp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  email: z.string().email().max(320),
});

function clientKey(req: Request, email: string): string {
  const xff = req.headers.get('x-forwarded-for') ?? '';
  const ip = xff.split(',')[0]?.trim() || 'unknown';
  return `otp:${ip}:${email.toLowerCase()}`;
}

export async function POST(request: Request): Promise<Response> {
  let parsed: z.infer<typeof bodySchema>;
  try {
    const raw = await request.json();
    parsed = bodySchema.parse(raw);
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'invalid_body' };
    return NextResponse.json(body, { status: 400 });
  }

  const email = parsed.email.toLowerCase().trim();
  const limiter = getAuthLimiter();
  const { success, remaining, resetAt } = await limiter.check(clientKey(request, email));
  if (!success) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'rate_limited' };
    return NextResponse.json(body, {
      status: 429,
      headers: {
        'x-ratelimit-remaining': String(remaining),
        'x-ratelimit-reset': String(resetAt),
      },
    });
  }

  const db = getDb();
  const result = await issueOtp(db, email);

  // In production the plain code would be emailed via Resend, never returned.
  // In dev (no RESEND_API_KEY) we echo it back so developers can test locally.
  const isDevEcho = process.env.NODE_ENV !== 'production' && !process.env.RESEND_API_KEY;

  const body: ApiEnvelope<{ expiresInSeconds: number; devCode?: string }> = {
    success: true,
    data: {
      expiresInSeconds: result.expiresInSeconds,
      ...(isDevEcho ? { devCode: result.code } : {}),
    },
    error: null,
  };
  return NextResponse.json(body, { status: 200 });
}
