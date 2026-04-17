import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session';

/**
 * Route protection.
 *
 * We only check for the *presence* of the session cookie in middleware.
 * Full validation (including expiry + revocation) happens in server
 * components via `resolveSession`. This keeps middleware fast and
 * edge-runtime compatible.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/workspace') || pathname.startsWith('/onboarding')) {
    const cookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!cookie?.value) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/workspace/:path*', '/onboarding/:path*'],
};
