import { NextResponse } from 'next/server';
import type { ApiEnvelope } from '@kitz/types';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const match = cookieHeader.match(new RegExp(`(?:^|; )${SESSION_COOKIE_NAME}=([^;]+)`));
  const token = match?.[1];

  if (token) {
    const db = getDb();
    await db.revokeSession(token);
  }

  const body: ApiEnvelope<null> = { success: true, data: null, error: null };
  const response = NextResponse.json(body, { status: 200 });
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
