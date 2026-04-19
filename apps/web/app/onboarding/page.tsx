import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME, resolveSession } from '@/lib/auth/session';
import OnboardingForm from './onboarding-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Configurar · KitZ',
};

export default async function OnboardingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const db = getDb();
  const session = await resolveSession(db, token);
  if (!session) {
    if (token) cookieStore.delete(SESSION_COOKIE_NAME);
    redirect('/login');
  }

  const existing = await db.findPrimaryTenant(session.user_id);
  if (existing) redirect('/workspace');

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <section className="kz-panel" style={{ width: '100%', maxWidth: '36rem' }}>
        <p className="kz-mute kz-prompt" style={{ marginBottom: '1rem' }}>
          kitz init
        </p>
        <h1 style={{ marginBottom: '0.5rem' }}>Configurar tu espacio</h1>
        <p className="kz-mute" style={{ marginBottom: '1rem' }}>
          Sesión: <span style={{ color: 'var(--kitz-text-strong)' }}>{session.email}</span>
        </p>
        <div className="kz-divider" />
        <div style={{ marginTop: '1.5rem' }}>
          <OnboardingForm />
        </div>
      </section>
    </main>
  );
}
