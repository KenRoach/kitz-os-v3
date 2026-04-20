import Link from 'next/link';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME, resolveSession } from '@/lib/auth/session';
import PersonalityForm from './personality-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Personalidad · KitZ' };

/**
 * Personalidad — system-prompt editor for the active agent.
 *
 * Reads the active agent server-side, hands the current prompt +
 * description to a small client form that PATCHes /api/agents/[id].
 * If no agent is active, prompts the user to set one up first.
 */
export default async function PersonalidadPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const db = getDb();
  const session = await resolveSession(db, token);
  const primary = session ? await db.findPrimaryTenant(session.user_id) : null;
  if (!session || !primary) return null;

  const active = await db.agents.getActive(primary.tenant.id);

  return (
    <section
      style={{
        padding: 'clamp(1rem, 2.5vw, 2rem)',
        maxWidth: '60rem',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      <header>
        <p className="kz-mute kz-prompt" style={{ marginBottom: '0.5rem' }}>
          kitz brain personality
        </p>
        <h1 style={{ marginBottom: '0.25rem' }}>Personalidad</h1>
        <p className="kz-mute" style={{ margin: 0 }}>
          La voz, el tono y el comportamiento del agente activo.
        </p>
      </header>

      {!active ? (
        <div
          className="kz-panel"
          style={{
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            alignItems: 'flex-start',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.95rem' }}>
            No hay un agente activo en este espacio.
          </p>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--kitz-ink-2)' }}>
            Personalidad edita el system prompt del agente activo. Crea o activa uno
            primero.
          </p>
          <Link
            href="/workspace/brain/agentes"
            className="kz-button"
            style={{
              width: 'auto',
              padding: '0.5rem 1rem',
              fontSize: '0.75rem',
              textDecoration: 'none',
            }}
          >
            Ir a Agentes
          </Link>
        </div>
      ) : (
        <div
          className="kz-panel"
          style={{
            padding: 'clamp(1rem, 2vw, 1.5rem)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <header
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.6rem',
                  color: 'var(--kitz-ink-3)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Agente activo
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>{active.name}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--kitz-ink-3)' }}>
                {active.model} · {active.slug}
              </div>
            </div>
            <Link
              href="/workspace/brain/agentes"
              style={{
                fontSize: '0.7rem',
                color: 'var(--kitz-ink-2)',
                background: 'transparent',
                border: '1px solid var(--kitz-line)',
                padding: '0.3rem 0.6rem',
                textDecoration: 'none',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Cambiar agente activo
            </Link>
          </header>

          <PersonalityForm
            agentId={active.id}
            agentName={active.name}
            initialPrompt={active.system_prompt}
            initialDescription={active.description ?? null}
          />
        </div>
      )}
    </section>
  );
}
