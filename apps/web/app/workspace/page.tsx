import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME, resolveSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function WorkspacePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await resolveSession(getDb(), token);
  if (!session) redirect('/login');

  return (
    <main style={{ padding: '4rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '2rem', margin: 0 }}>Workspace</h1>
      <p style={{ color: '#666', marginTop: '0.5rem' }}>
        Autenticado como <strong>{session.email}</strong>.
      </p>
      <p style={{ color: '#888', marginTop: '2rem', fontSize: '0.875rem' }}>
        Phase 1 · Module 2 (Auth) complete. El shell de 3 columnas llega en Module 4.
      </p>
    </main>
  );
}
