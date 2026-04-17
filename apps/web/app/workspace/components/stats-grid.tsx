import type { TenantStats } from '@kitz/db';

type Metric = { label: string; value: string; sub?: string };

function toMetrics(stats: TenantStats): Metric[] {
  const ratio =
    stats.credits.lifetimeTopup > 0
      ? Math.round((stats.credits.balance / stats.credits.lifetimeTopup) * 100)
      : 0;
  return [
    { label: 'Contactos', value: String(stats.contacts) },
    { label: 'Conversaciones', value: String(stats.conversations) },
    { label: 'Agentes', value: String(stats.agents) },
    {
      label: 'Créditos IA',
      value: `${stats.credits.balance}`,
      sub: `${ratio}% de ${stats.credits.lifetimeTopup}`,
    },
  ];
}

export default function StatsGrid({ stats }: { stats: TenantStats }) {
  const metrics = toMetrics(stats);
  return (
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
      {metrics.map((m) => (
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
          {m.sub && (
            <p className="kz-mute" style={{ margin: '0.25rem 0 0 0', fontSize: '0.7rem' }}>
              {m.sub}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
