import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME, resolveSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard · KitZ',
};

const METRICS = [
  { label: 'Contactos', value: '—' },
  { label: 'Conversaciones', value: '—' },
  { label: 'Agentes', value: '—' },
  { label: 'Créditos IA', value: '—' },
];

const CHECKLIST = [
  { key: 'auth', label: 'Autenticación activa', done: true },
  { key: 'onboarding', label: 'Espacio creado', done: true },
  { key: 'contacts', label: 'Agregar primer contacto', done: false },
  { key: 'whatsapp', label: 'Conectar WhatsApp', done: false },
  { key: 'agent', label: 'Configurar primer agente', done: false },
];

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const db = getDb();
  const session = await resolveSession(db, token);
  const primary = session ? await db.findPrimaryTenant(session.user_id) : null;

  return (
    <section style={{ padding: '2rem', maxWidth: '60rem' }}>
      <p className="kz-mute kz-prompt" style={{ marginBottom: '0.5rem' }}>
        kitz dashboard
      </p>
      <h1 style={{ marginBottom: '0.25rem' }}>Dashboard</h1>
      <p className="kz-mute" style={{ marginBottom: '2rem' }}>
        {primary?.tenant.name ?? '—'} · {primary?.membership.role ?? '—'}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))',
          gap: '1px',
          background: 'var(--kitz-border)',
          border: '1px solid var(--kitz-border)',
          marginBottom: '2rem',
        }}
      >
        {METRICS.map((m) => (
          <div key={m.label} style={{ background: 'var(--kitz-bg)', padding: '1rem' }}>
            <p className="kz-label" style={{ margin: 0 }}>
              {m.label}
            </p>
            <p
              style={{
                margin: '0.5rem 0 0 0',
                fontSize: '1.5rem',
                color: 'var(--kitz-text-strong)',
              }}
            >
              {m.value}
            </p>
          </div>
        ))}
      </div>

      <div className="kz-panel">
        <p className="kz-mute kz-prompt" style={{ margin: 0, marginBottom: '0.75rem' }}>
          kitz doctor
        </p>
        <h2 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Checklist</h2>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.5rem' }}>
          {CHECKLIST.map((item) => (
            <li key={item.key} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span
                aria-hidden
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '1.25rem',
                  height: '1.25rem',
                  border: '1px solid var(--kitz-border)',
                  color: item.done ? 'var(--kitz-text-strong)' : 'var(--kitz-text-dim)',
                  fontSize: '0.75rem',
                }}
              >
                {item.done ? '✓' : ' '}
              </span>
              <span
                style={{
                  color: item.done ? 'var(--kitz-text-dim)' : 'var(--kitz-text-strong)',
                  textDecoration: item.done ? 'line-through' : 'none',
                }}
              >
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
