import type { TenantStats } from '@kitz/db';

export type ChecklistItem = {
  key: string;
  label: string;
  done: boolean;
};

export function buildChecklist(stats: TenantStats): ChecklistItem[] {
  return [
    { key: 'auth', label: 'Autenticación activa', done: true },
    { key: 'onboarding', label: 'Espacio creado', done: true },
    { key: 'contacts', label: 'Agregar primer contacto', done: stats.contacts > 0 },
    { key: 'agents', label: 'Configurar primer agente', done: stats.agents > 0 },
    { key: 'whatsapp', label: 'Conectar WhatsApp', done: stats.conversations > 0 },
  ];
}

export default function ReadinessChecklist({ items }: { items: ChecklistItem[] }) {
  const done = items.filter((i) => i.done).length;
  return (
    <div className="kz-panel">
      <p className="kz-mute kz-prompt" style={{ margin: 0, marginBottom: '0.75rem' }}>
        kitz doctor
      </p>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '1rem',
        }}
      >
        <h2 style={{ fontSize: '1rem', margin: 0 }}>Checklist</h2>
        <p className="kz-mute" style={{ margin: 0, fontSize: '0.75rem' }}>
          {done} / {items.length}
        </p>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.5rem' }}>
        {items.map((item) => (
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
  );
}
