import type { ActivityEvent } from '@kitz/db';

const ACTION_LABELS: Record<string, string> = {
  created_workspace: 'creó el espacio',
  created_contact: 'agregó un contacto',
  sent_message: 'envió un mensaje',
  received_message: 'recibió un mensaje',
  closed_deal: 'cerró un trato',
};

function relative(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  const mins = Math.round(delta / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.round(hrs / 24);
  return `hace ${days}d`;
}

export default function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="kz-panel">
        <p className="kz-mute kz-prompt" style={{ margin: 0, marginBottom: '0.75rem' }}>
          kitz log
        </p>
        <h2 style={{ fontSize: '1rem', margin: '0 0 0.75rem 0' }}>Actividad</h2>
        <p className="kz-mute" style={{ margin: 0 }}>
          Sin eventos aún. Tu flujo aparece aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="kz-panel">
      <p className="kz-mute kz-prompt" style={{ margin: 0, marginBottom: '0.75rem' }}>
        kitz log
      </p>
      <h2 style={{ fontSize: '1rem', margin: '0 0 0.75rem 0' }}>Actividad</h2>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.5rem' }}>
        {events.map((e) => (
          <li
            key={e.id}
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'baseline',
              fontSize: '0.8125rem',
            }}
          >
            <span className="kz-mute" style={{ minWidth: '4.5rem' }}>
              {relative(e.created_at)}
            </span>
            <span>
              <span style={{ color: 'var(--kitz-text-strong)' }}>
                {ACTION_LABELS[e.action] ?? e.action}
              </span>{' '}
              <span className="kz-mute">{e.entity}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
