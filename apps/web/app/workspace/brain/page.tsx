import Link from 'next/link';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME, resolveSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cerebro · KitZ' };

/**
 * Brain / Cerebro — landing for the Brain mode.
 *
 * Real summary of the AI subsystem: how many agents, which one is
 * active, how many skills, and the latest brain-related activity.
 * Replaces the previous "Coming soon" placeholder so the Brain mode
 * pill lands on a useful page.
 *
 * Per /frontend-design: asymmetric layout, single serif h1, no card
 * grid. The Active Agent card gets visual weight (it's the answer
 * to "what is KitZ doing right now?"), Skills + Activity sit smaller.
 */
export default async function BrainOverviewPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const db = getDb();
  const session = await resolveSession(db, token);
  const primary = session ? await db.findPrimaryTenant(session.user_id) : null;
  if (!session || !primary) return null;

  const [activeAgent, allAgents, allSkills, activity] = await Promise.all([
    db.agents.getActive(primary.tenant.id),
    db.agents.list(primary.tenant.id),
    db.skills.list(primary.tenant.id),
    db.listRecentActivity(primary.tenant.id, 10),
  ]);

  const brainActivity = activity.filter((a) =>
    /agent|skill|workpack|brain/.test(a.action),
  );

  return (
    <>
      <style>{`
        .kitz-brain-row {
          display: grid;
          gap: 1rem;
          grid-template-columns: 1fr;
        }
        @media (min-width: 768px) {
          .kitz-brain-row { grid-template-columns: 1.5fr 1fr; }
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
            kitz brain status
          </p>
          <h1 style={{ marginBottom: '0.25rem' }}>Cerebro</h1>
          <p className="kz-mute" style={{ margin: 0 }}>
            Configuración de la IA: agentes activos, skills y memoria del espacio.
          </p>
        </header>

        <div className="kitz-brain-row">
          {/* Active agent — the most important question */}
          <section
            className="kz-panel"
            style={{
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                fontSize: '0.6rem',
                color: 'var(--kitz-ink-3)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              Agente activo
            </div>
            {activeAgent ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '0.6rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{activeAgent.name}</h2>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      color: 'var(--kitz-ink-3)',
                      fontFamily: 'var(--kitz-font-mono)',
                    }}
                  >
                    {activeAgent.model} · {activeAgent.slug}
                  </span>
                </div>
                {activeAgent.description && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.85rem',
                      color: 'var(--kitz-ink-2)',
                      lineHeight: 1.5,
                    }}
                  >
                    {activeAgent.description}
                  </p>
                )}
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--kitz-ink-3)',
                    letterSpacing: '0.05em',
                  }}
                >
                  {activeAgent.tools.length} herramienta
                  {activeAgent.tools.length === 1 ? '' : 's'} ·{' '}
                  {activeAgent.skills?.length ?? 0} skill
                  {(activeAgent.skills?.length ?? 0) === 1 ? '' : 's'}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                  <Link
                    href="/workspace/brain/agentes"
                    style={{
                      fontSize: '0.7rem',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: 'var(--kitz-ink)',
                      background: 'var(--kitz-bg)',
                      border: '1px solid var(--kitz-line-strong)',
                      padding: '0.3rem 0.6rem',
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Configurar
                  </Link>
                  <Link
                    href="/workspace/brain/personalidad"
                    style={{
                      fontSize: '0.7rem',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: 'var(--kitz-ink-2)',
                      background: 'transparent',
                      border: '1px solid var(--kitz-line)',
                      padding: '0.3rem 0.6rem',
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Editar prompt
                  </Link>
                </div>
              </>
            ) : (
              <div
                style={{
                  padding: '0.75rem',
                  border: '1px dashed var(--kitz-ink-3)',
                  fontSize: '0.85rem',
                  color: 'var(--kitz-ink-2)',
                }}
              >
                No hay un agente activo todavía.{' '}
                <Link
                  href="/workspace/brain/agentes"
                  style={{ color: 'var(--kitz-ink)' }}
                >
                  Configurar uno →
                </Link>
              </div>
            )}
          </section>

          {/* Counts */}
          <section
            className="kz-panel"
            style={{
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
            }}
          >
            <h2 style={{ fontSize: '1rem', margin: 0 }}>Inventario</h2>
            <Link
              href="/workspace/brain/agentes"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                padding: '0.4rem 0',
                borderBottom: '1px solid var(--kitz-line)',
                textDecoration: 'none',
                color: 'var(--kitz-ink)',
              }}
            >
              <span style={{ fontSize: '0.85rem' }}>Agentes</span>
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {allAgents.length}
              </span>
            </Link>
            <Link
              href="/workspace/brain/skills"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                padding: '0.4rem 0',
                borderBottom: '1px solid var(--kitz-line)',
                textDecoration: 'none',
                color: 'var(--kitz-ink)',
              }}
            >
              <span style={{ fontSize: '0.85rem' }}>Skills</span>
              <span
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {allSkills.length}
              </span>
            </Link>
            <Link
              href="/workspace/brain/conocimiento"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                padding: '0.4rem 0',
                textDecoration: 'none',
                color: 'var(--kitz-ink)',
              }}
            >
              <span style={{ fontSize: '0.85rem' }}>Conocimiento</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--kitz-ink-3)',
                  letterSpacing: '0.05em',
                }}
              >
                Ver →
              </span>
            </Link>
          </section>
        </div>

        {/* Brain activity */}
        <section
          className="kz-panel"
          style={{
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
          }}
        >
          <header
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
            }}
          >
            <h2 style={{ fontSize: '1rem', margin: 0 }}>Actividad del cerebro</h2>
            <Link
              href="/workspace/brain/registro"
              style={{
                fontSize: '0.7rem',
                color: 'var(--kitz-ink-3)',
                textDecoration: 'none',
                letterSpacing: '0.05em',
              }}
            >
              Ver registro →
            </Link>
          </header>
          {brainActivity.length === 0 ? (
            <p
              style={{
                margin: 0,
                fontSize: '0.85rem',
                color: 'var(--kitz-ink-3)',
              }}
            >
              Sin actividad reciente.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {brainActivity.slice(0, 6).map((a) => (
                <li
                  key={a.id}
                  style={{
                    display: 'flex',
                    gap: '0.6rem',
                    padding: '0.35rem 0',
                    borderBottom: '1px solid var(--kitz-line)',
                    fontSize: '0.85rem',
                  }}
                >
                  <span
                    style={{
                      color: 'var(--kitz-ink-3)',
                      fontFamily: 'var(--kitz-font-mono)',
                      fontSize: '0.7rem',
                      minWidth: '6rem',
                    }}
                  >
                    {new Date(a.created_at).toLocaleTimeString('es', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span style={{ flex: 1 }}>
                    <span style={{ color: 'var(--kitz-accent-gold)', fontWeight: 600 }}>
                      {a.action}
                    </span>{' '}
                    <span style={{ color: 'var(--kitz-ink-3)' }}>· {a.entity}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </>
  );
}
