import { strings, DEFAULT_LOCALE } from '@kitz/i18n';

export default function HomePage() {
  const copy = strings[DEFAULT_LOCALE];
  return (
    <main style={{ padding: '4rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '3rem', margin: 0 }}>KitZ</h1>
      <p style={{ fontSize: '1.25rem', marginTop: '1rem', maxWidth: '48rem' }}>{copy.tagline}</p>
      <p style={{ marginTop: '2rem', color: '#666' }}>{copy.greeting}</p>
    </main>
  );
}
