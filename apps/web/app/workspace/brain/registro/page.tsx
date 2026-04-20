import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME, resolveSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Registro · KitZ' };

const ACTION_COLOR: Record<string, string> = {
  sent_message: 'var(--kitz-accent-gold)',
  topup_battery: 'var(--kitz-moss)',
  reports_insight: 'var(--kitz-accent-gold)',
  seeded_workpack: 'var(--kitz-ink-2)',
  switched_mode: 'var(--kitz-ink-2)',
  // Defaults handled inline
};

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function relTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return `hace ${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `hace ${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `hace ${hr}h`;
  const d = Math.round(hr / 24);
  return `hace ${d}d`;
}

/**
 * Registro — full chronological activity log.
 *
 * The Dashboard's ActivityFeed shows the latest 10. This page shows
 * the full 200-entry tail with relative + absolute timestamps and
 * a filter strip for the most common action types.
 */
export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const sp = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const db = getDb();
  const session = await resolveSession(db, token);
  const primary = session ? await db.findPrimaryTenant(session.user_id) : null;
  if (!session || !primary) return null;

  const all = await db.listRecentActivity(primary.tenant.id, 200);
  const filter = sp.filter ?? 'all';

  // Build the filter chip list dynamically from what's actually in the log
  // — avoids dead chips when a category has no entries yet.
  const counts = new Map<string, number>();
  for (const a of all) counts.set(a.action, (counts.get(a.action) ?? 0) + 1);
  const sortedActions = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

  const filtered = filter === 'all' ? all : all.filter((a) => a.action === filter);

  return (
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
          kitz brain logs
        </p>
        <h1 style={{ marginBottom: '0.25rem' }}>Registro</h1>
        <p className="kz-mute" style={{ margin: 0 }}>
          Cada acción ejecutada en el espacio. Últimas {all.length} entradas.
        </p>
      </header>

      {/* Filter chips */}
      {sortedActions.length > 0 && (
        <nav
          aria-label="Filtros de acción"
          style={{
            display: 'flex',
            gap: '0.4rem',
            flexWrap: 'wrap',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid var(--kitz-line)',
          }}
        >
          <a
            href="/workspace/brain/registro"
            style={{
              padding: '0.25rem 0.6rem',
              border: '1px solid var(--kitz-line-strong)',
              background: filter === 'all' ? 'var(--kitz-ink)' : 'var(--kitz-bg)',
              color: filter === 'all' ? 'var(--kitz-bg)' : 'var(--kitz-ink)',
              fontSize: '0.65rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontWeight: 600,
              textDecoration: 'none',
              fontFamily: 'var(--kitz-font-mono)',
            }}
          >
            Todo · {all.length}
          </a>
          {sortedActions.slice(0, 8).map(([action, count]) => {
            const active = filter === action;
            return (
              <a
                key={action}
                href={`/workspace/brain/registro?filter=${encodeURIComponent(action)}`}
                style={{
                  padding: '0.25rem 0.6rem',
                  border: '1px solid var(--kitz-line)',
                  background: active ? 'var(--kitz-ink)' : 'transparent',
                  color: active ? 'var(--kitz-bg)' : 'var(--kitz-ink-2)',
                  fontSize: '0.65rem',
                  letterSpacing: '0.04em',
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontFamily: 'var(--kitz-font-mono)',
                }}
              >
                {action} · {count}
              </a>
            );
          })}
        </nav>
      )}

      {filtered.length === 0 ? (
        <div
          className="kz-panel"
          style={{
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--kitz-ink-3)',
            fontSize: '0.9rem',
          }}
        >
          {all.length === 0 ? 'Sin actividad todavía.' : 'Nada coincide con este filtro.'}
        </div>
      ) : (
        <ol
          className="kz-panel"
          style={{
            padding: 0,
            margin: 0,
            listStyle: 'none',
          }}
        >
          {filtered.map((a, i) => (
            <li
              key={a.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(8rem, 10rem) minmax(8rem, 12rem) 1fr',
                alignItems: 'baseline',
                gap: '0.85rem',
                padding: '0.55rem 0.85rem',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--kitz-line)' : 'none',
                fontSize: '0.8rem',
              }}
            >
              <span
                title={fmtDateTime(a.created_at)}
                style={{
                  color: 'var(--kitz-ink-3)',
                  fontFamily: 'var(--kitz-font-mono)',
                  fontSize: '0.7rem',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {relTime(a.created_at)}
              </span>
              <span
                style={{
                  color: ACTION_COLOR[a.action] ?? 'var(--kitz-ink)',
                  fontWeight: 600,
                  fontFamily: 'var(--kitz-font-mono)',
                  fontSize: '0.75rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {a.action}
              </span>
              <span
                style={{
                  color: 'var(--kitz-ink-2)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {a.entity}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
