import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Ajustes · KitZ',
};

const SECTIONS: { href: string; title: string; description: string; status?: string }[] = [
  {
    href: '/workspace/ajustes/facturacion',
    title: 'Facturación',
    description: 'Plan, batería de créditos, recargas y movimientos.',
  },
  {
    href: '/workspace/ajustes',
    title: 'Espacio de trabajo',
    description: 'Nombre, slug y configuración general.',
    status: 'Próximamente',
  },
  {
    href: '/workspace/ajustes',
    title: 'Miembros',
    description: 'Invita y gestiona roles de tu equipo.',
    status: 'Próximamente',
  },
  {
    href: '/workspace/ajustes',
    title: 'Integraciones',
    description: 'Conecta WhatsApp, Google, Stripe y más.',
    status: 'Próximamente',
  },
];

export default function AjustesPage() {
  return (
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
        <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Ajustes</h1>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#666' }}>
          Configuración de tu espacio de trabajo.
        </p>
      </header>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '0.75rem',
        }}
      >
        {SECTIONS.map((s) => {
          const disabled = Boolean(s.status);
          const card = (
            <article
              style={{
                border: '1px solid #000',
                background: '#fff',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                opacity: disabled ? 0.6 : 1,
                cursor: disabled ? 'default' : 'pointer',
                height: '100%',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>{s.title}</h2>
                {s.status && (
                  <span style={{ fontSize: '0.65rem', color: '#a60' }}>{s.status}</span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>{s.description}</p>
            </article>
          );
          return disabled ? (
            <div key={s.title}>{card}</div>
          ) : (
            <Link key={s.title} href={s.href} style={{ textDecoration: 'none', color: 'inherit' }}>
              {card}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
