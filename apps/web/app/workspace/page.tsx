import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME, resolveSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Espacio · KitZ',
};

export default async function WorkspacePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const db = getDb();
  const session = await resolveSession(db, token);
  if (!session) redirect('/login');

  const primary = await db.findPrimaryTenant(session.user_id);
  if (!primary) redirect('/onboarding');

  return (
    <main style={{ minHeight: '100vh', padding: '3rem 2rem' }}>
      <section className="kz-panel" style={{ maxWidth: '48rem', margin: '0 auto' }}>
        <p className="kz-mute kz-prompt" style={{ marginBottom: '0.5rem' }}>
          kitz status
        </p>
        <h1 style={{ marginBottom: '1rem' }}>Espacio</h1>

        <div className="kz-divider" />

        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: '10rem 1fr',
            gap: '0.75rem 1rem',
            margin: '1rem 0',
          }}
        >
          <dt className="kz-label" style={{ margin: 0 }}>
            Espacio
          </dt>
          <dd style={{ margin: 0, color: 'var(--kitz-text-strong)' }}>{primary.tenant.name}</dd>

          <dt className="kz-label" style={{ margin: 0 }}>
            Slug
          </dt>
          <dd style={{ margin: 0, color: 'var(--kitz-text-strong)' }}>{primary.tenant.slug}</dd>

          <dt className="kz-label" style={{ margin: 0 }}>
            Plan
          </dt>
          <dd style={{ margin: 0 }}>{primary.tenant.plan}</dd>

          <dt className="kz-label" style={{ margin: 0 }}>
            Rol
          </dt>
          <dd style={{ margin: 0 }}>{primary.membership.role}</dd>

          <dt className="kz-label" style={{ margin: 0 }}>
            Usuario
          </dt>
          <dd style={{ margin: 0 }}>{session.email}</dd>
        </dl>

        <div className="kz-divider" />

        <p className="kz-mute" style={{ marginTop: '1rem' }}>
          Phase 1 · Module 3 (Onboarding) completo. El shell de 3 columnas llega en Module 4.
        </p>
      </section>
    </main>
  );
}
