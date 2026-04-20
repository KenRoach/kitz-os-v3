import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME, resolveSession } from '@/lib/auth/session';
import StatsGrid from './components/stats-grid';
import ActivityFeed from './components/activity-feed';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard · KitZ',
};

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const db = getDb();
  const session = await resolveSession(db, token);
  const primary = session ? await db.findPrimaryTenant(session.user_id) : null;

  // Layout guard redirects before this; these fallbacks only satisfy types.
  if (!session || !primary) return null;

  const [stats, activity] = await Promise.all([
    db.getTenantStats(primary.tenant.id),
    db.listRecentActivity(primary.tenant.id, 10),
  ]);

  // The setup checklist lives in the floating SetupGuide rendered by
  // the workspace layout — single source of truth. Don't duplicate it
  // here on the dashboard.

  return (
    <section style={{ padding: '2rem', maxWidth: '60rem', margin: '0 auto' }}>
      <p className="kz-mute kz-prompt" style={{ marginBottom: '0.5rem' }}>
        kitz dashboard
      </p>
      <h1 style={{ marginBottom: '0.25rem' }}>Dashboard</h1>
      <p className="kz-mute" style={{ marginBottom: '2rem' }}>
        {primary.tenant.name} · {primary.membership.role}
      </p>

      <StatsGrid stats={stats} />

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <ActivityFeed events={activity} />
      </div>
    </section>
  );
}
