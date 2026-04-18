import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME, resolveSession } from '@/lib/auth/session';
import ShellNav from './shell-nav';
import ShellChat from './shell-chat';
import TopNav from './top-nav';

export const dynamic = 'force-dynamic';

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const db = getDb();
  const session = await resolveSession(db, token);
  if (!session) redirect('/login');

  const primary = await db.findPrimaryTenant(session.user_id);
  if (!primary) redirect('/onboarding');

  const stats = await db.getTenantStats(primary.tenant.id);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--kitz-bg)',
      }}
    >
      <TopNav
        tenantName={primary.tenant.name}
        credits={stats.credits.balance}
        lifetimeTopup={stats.credits.lifetimeTopup}
      />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <ShellNav
          tenantSlug={primary.tenant.slug}
          role={primary.membership.role}
          email={session.email}
        />
        <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>{children}</main>
        <ShellChat />
      </div>
    </div>
  );
}
