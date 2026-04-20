import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME, resolveSession } from '@/lib/auth/session';
import StatsGrid from './components/stats-grid';
import ActivityFeed from './components/activity-feed';
import TodayPanel from './components/today-panel';
import SetupCard from './components/setup-card';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard · KitZ',
};

/**
 * Dashboard — command center.
 *
 * Composition (per /frontend-design):
 *   - Single direction: terminal-Japandi already established
 *   - Asymmetric layout, NOT symmetrical card grid: Hoy is the live
 *     signal (gets the wider 2fr column on desktop), Setup is the
 *     static checklist (1fr). On <= 720px both stack to single column.
 *   - One earned moment per page: gold progress bar on Setup
 *   - No drop shadows, no rounded corners, no gradients — keep the
 *     established system. The bone-white bg + 1px ink frames ARE the
 *     atmosphere.
 *
 * Responsive grid: clamp() padding scales bezels with viewport. The
 * 2fr/1fr ratio collapses to 1fr at narrow widths via the media query
 * applied in the component itself (CSS-in-style not possible here, so
 * we use the surface-level grid and rely on TodayPanel/SetupCard to
 * stay readable at every width).
 */
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

  return (
    <>
      {/* Asymmetric grid: 2fr Hoy / 1fr Setup on >= 768px, stacks below. */}
      <style>{`
        .kitz-dash-row {
          display: grid;
          gap: 1rem;
          grid-template-columns: 1fr;
          align-items: stretch;
        }
        @media (min-width: 768px) {
          .kitz-dash-row { grid-template-columns: 2fr 1fr; }
        }
      `}</style>

      <section
        style={{
          padding: 'clamp(1rem, 2.5vw, 2rem)',
          maxWidth: '72rem',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        <header>
          <p className="kz-mute kz-prompt" style={{ marginBottom: '0.5rem' }}>
            kitz dashboard
          </p>
          <h1 style={{ marginBottom: '0.25rem' }}>Dashboard</h1>
          <p className="kz-mute" style={{ margin: 0 }}>
            {primary.tenant.name} · {primary.membership.role}
          </p>
        </header>

        <StatsGrid stats={stats} />

        {/* Hoy + Configuración — asymmetric on desktop, stacked on mobile */}
        <div className="kitz-dash-row">
          <TodayPanel tenantId={primary.tenant.id} db={db} />
          <SetupCard tenantId={primary.tenant.id} db={db} />
        </div>

        {/* Activity full width */}
        <ActivityFeed events={activity} />
      </section>
    </>
  );
}
