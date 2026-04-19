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
import { FullscreenProvider } from './fullscreen-context';

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
    // expired. Clear it so the user only has to log in once instead of
    // bouncing back here on the next attempt with the same dead cookie.
    if (token) cookieStore.delete(SESSION_COOKIE_NAME);
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
      <div
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
          <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>{children}</main>
          <ShellChat />
        </div>
      </div>
      {/* Floating Stripe-style setup checklist (auto-hides when complete) */}
      <SetupGuide tenantSlug={resolved.tenant.slug} />
    </FullscreenProvider>
  );
}
