import Link from 'next/link';
import { strings, DEFAULT_LOCALE } from '@kitz/i18n';

export default function HomePage() {
  const copy = strings[DEFAULT_LOCALE];
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <section className="kz-panel" style={{ width: '100%', maxWidth: '36rem' }}>
        <p className="kz-mute kz-prompt" style={{ marginBottom: '1rem' }}>
          kitz --version 0.0.0
        </p>
        <h1 style={{ marginBottom: '0.75rem' }}>KitZ</h1>
        <p style={{ marginBottom: '1.5rem' }}>{copy.tagline}</p>
        <div className="kz-divider" />
        <p className="kz-mute" style={{ marginBottom: '1.5rem' }}>
          {copy.greeting}
        </p>
        <Link
          href="/login"
          className="kz-button"
          style={{
            display: 'inline-block',
            width: 'auto',
            padding: '0.75rem 1.5rem',
            textDecoration: 'none',
          }}
        >
          Entrar →
        </Link>
      </section>
    </main>
  );
}
