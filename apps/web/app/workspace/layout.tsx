import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME, resolveSession } from '@/lib/auth/session';
import ShellNav from './shell-nav';
import ShellChat from './shell-chat';

export const dynamic = 'force-dynamic';

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const db = getDb();
  const session = await resolveSession(db, token);
  if (!session) redirect('/login');

  const primary = await db.findPrimaryTenant(session.user_id);
  if (!primary) redirect('/onboarding');

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--kitz-bg)',
      }}
    >
      <ShellNav
        tenantName={primary.tenant.name}
        tenantSlug={primary.tenant.slug}
        role={primary.membership.role}
        email={session.email}
      />
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', height: '100vh' }}>{children}</main>
      <ShellChat />
    </div>
  );
}
