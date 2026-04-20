import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME, resolveSession } from '@/lib/auth/session';
import {
  WORKSPACE_MODE_COOKIE,
  isWorkspaceMode,
  resolveTenantForMode,
  type WorkspaceMode,
} from '@/lib/auth/mode';
import ShellNav from './shell-nav';
import ShellChat from './shell-chat';
import TopNav from './top-nav';
import SandboxBanner from './sandbox-banner';
import SetupGuide from './setup-guide';
import MobileMount from './mobile-mount';
import { FullscreenProvider } from './fullscreen-context';
import { AlertLayer } from '@/lib/stream/alert-layer';

export const dynamic = 'force-dynamic';

/**
 * Workspace shell.
 *
 *   ┌──────────────────────────────────────────────────┐
 *   │  SandboxBanner (only in sandbox mode)            │
 *   ├──────────────────────────────────────────────────┤
 *   │  TopNav                                          │
 *   ├──────────┬───────────────────────────┬───────────┤
 *   │ ShellNav │      page content         │ ShellChat │
 *   └──────────┴───────────────────────────┴───────────┘
 *
 * Tenant resolution is mode-aware: the `kitz_mode` cookie picks between
 * the user's paired sandbox tenant and their live tenant. Defaults to
 * sandbox so first-time users land in the seeded demo workspace.
 */
export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const db = getDb();
  const session = await resolveSession(db, token);
  if (!session) {
    // Stale cookie path: middleware saw a cookie present and let us
    // through, but the in-memory session was wiped (dev restart) or
    // expired. We'd LIKE to delete the cookie here so the user only has
    // to log in once, but Next 15 forbids cookie writes in plain Server
    // Components — only Server Actions or Route Handlers can mutate
    // cookies. Wrap in a try so the delete attempt doesn't blow up the
    // layout; the redirect-to-login still happens, and the verify route
    // overwrites the cookie on the next OTP submit.
    if (token) {
      try {
        cookieStore.delete(SESSION_COOKIE_NAME);
      } catch {
        /* not fatal — middleware will see the new cookie next request */
      }
    }
    redirect('/login');
  }

  const tenants = await db.listTenantsForUser(session.user_id);
  if (tenants.length === 0) redirect('/onboarding');

  const rawMode = cookieStore.get(WORKSPACE_MODE_COOKIE)?.value;
  const mode: WorkspaceMode = isWorkspaceMode(rawMode) ? rawMode : 'sandbox';
  const resolved = (await resolveTenantForMode(db, session.user_id, mode)) ?? tenants[0]!;

  const hasSandbox = tenants.some((t) => t.tenant.slug.endsWith('-sandbox'));
  const hasLive = tenants.some((t) => !t.tenant.slug.endsWith('-sandbox'));
  const stats = await db.getTenantStats(resolved.tenant.id);

  return (
    <FullscreenProvider>
      {/* Viewport swap: desktop chrome <= 768px is hidden, MobileMount
          takes over with its own fullscreen fixed-position layer. */}
      <style>{`
        @media (max-width: 768px) {
          .kitz-desktop-shell { display: none !important; }
        }
      `}</style>

      <div
        className="kitz-desktop-shell"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
          background: 'var(--kitz-bg)',
        }}
      >
        <SandboxBanner mode={mode} hasLive={hasLive} />
        <TopNav
          tenantName={resolved.tenant.name}
          credits={stats.credits.balance}
          lifetimeTopup={stats.credits.lifetimeTopup}
        />
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <ShellNav
            tenantSlug={resolved.tenant.slug}
            role={resolved.membership.role}
            email={session.email}
            mode={mode}
            hasSandbox={hasSandbox}
            hasLive={hasLive}
          />
          {/*
           * Document-feel content column. Caps the workspace canvas at
           * a 72rem reading measure on large monitors so list pages
           * don't stretch into spreadsheet territory, but stays fully
           * fluid below that so mid-range laptops still use the full
           * viewport. The outer <main> keeps `flex: 1` so the chat
           * rail still docks against the right edge; the inner div
           * does the centering + max-width work.
           */}
          <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
            <div
              style={{
                maxWidth: '72rem',
                margin: '0 auto',
                minHeight: '100%',
              }}
            >
              {children}
            </div>
          </main>
          <ShellChat />
        </div>
      </div>
      {/* Floating Stripe-style setup checklist — position:fixed so it
          renders on both desktop and mobile viewports. */}
      <SetupGuide tenantSlug={resolved.tenant.slug} />

      {/* Cross-device alert stack — subscribes to /api/stream so any
          server-side emit (WhatsApp inbound, invoice paid, etc) pops
          a toast on whichever shell is currently open. */}
      <AlertLayer />

      {/* Mobile experience — only renders on viewports <= 768px */}
      <MobileMount
        tenantName={resolved.tenant.name}
        credits={stats.credits.balance}
        email={session.email}
        mode={mode}
        hasLive={hasLive}
      />
    </FullscreenProvider>
  );
}
