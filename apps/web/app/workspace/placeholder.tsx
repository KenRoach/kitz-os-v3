type PlaceholderProps = {
  command: string;
  title: string;
  description: string;
  shippingIn: string;
};

export default function WorkspacePlaceholder({
  command,
  title,
  description,
  shippingIn,
}: PlaceholderProps) {
  return (
    <section style={{ padding: '2rem', maxWidth: '60rem' }}>
      <p className="kz-mute kz-prompt" style={{ marginBottom: '0.5rem' }}>
        {command}
      </p>
      <h1 style={{ marginBottom: '0.25rem' }}>{title}</h1>
      <p className="kz-mute" style={{ marginBottom: '2rem' }}>
        {description}
      </p>

      <div className="kz-panel">
        <p className="kz-mute" style={{ margin: 0 }}>
          Este módulo se activa en{' '}
          <span style={{ color: 'var(--kitz-text-strong)' }}>{shippingIn}</span>.
        </p>
      </div>
    </section>
  );
}
