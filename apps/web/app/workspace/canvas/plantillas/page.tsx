import Link from 'next/link';
import { WORK_PACKS } from '@kitz/agents/work-packs';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Plantillas · KitZ' };

/**
 * Plantillas — workpack templates the user can reference or apply.
 *
 * Each workpack is a curated set of agents + tools tuned for a specific
 * SMB use case. The "Nuevo agente con esta plantilla" link deeplinks
 * to the agent creation flow with the pack pre-selected (the agent
 * picker reads the slug from the workpack catalogue).
 */
export default function PlantillasPage() {
  return (
    <>
      <style>{`
        .kitz-plantillas-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: 1fr;
        }
        @media (min-width: 720px) {
          .kitz-plantillas-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1200px) {
          .kitz-plantillas-grid { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>

      <section
        style={{
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          height: '100%',
          overflow: 'auto',
        }}
      >
        <header>
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Plantillas</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#666' }}>
            Configuraciones de agentes pre-empaquetadas para casos comunes.
          </p>
        </header>

        <div className="kitz-plantillas-grid">
          {WORK_PACKS.map((pack) => (
            <article
              key={pack.slug}
              className="kz-panel"
              style={{
                padding: '1.15rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                minHeight: '13rem',
              }}
            >
              <header>
                <div
                  style={{
                    fontSize: '0.6rem',
                    color: 'var(--kitz-accent-gold)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  {pack.slug}
                </div>
                <h2 style={{ fontSize: '1.05rem', margin: 0 }}>{pack.name}</h2>
              </header>

              <p
                style={{
                  margin: 0,
                  fontSize: '0.8rem',
                  color: 'var(--kitz-ink-2)',
                  fontStyle: 'italic',
                }}
              >
                {pack.tagline}
              </p>

              <p
                style={{
                  margin: 0,
                  fontSize: '0.85rem',
                  color: 'var(--kitz-ink)',
                  lineHeight: 1.5,
                }}
              >
                {pack.description}
              </p>

              <div
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  paddingTop: '0.6rem',
                  borderTop: '1px solid var(--kitz-line)',
                }}
              >
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--kitz-ink-3)',
                    letterSpacing: '0.05em',
                  }}
                >
                  {pack.agents.length} agente{pack.agents.length === 1 ? '' : 's'}
                </span>
                <Link
                  href="/workspace/brain/agentes"
                  style={{
                    fontSize: '0.65rem',
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
                  Ver agentes
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
