import { Suspense } from 'react';
import LoginForm from './login-form';

export const metadata = {
  title: 'Entrar · KitZ',
};

// LoginForm uses useSearchParams() for the ?next= round-trip, which forces
// dynamic rendering unless we wrap it in a Suspense boundary at the page
// level. Boundary lets the static shell prerender while the form streams
// in once the search params resolve.

export default function LoginPage() {
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
      <section className="kz-panel" style={{ width: '100%', maxWidth: '28rem' }}>
        <p className="kz-mute kz-prompt" style={{ marginBottom: '1rem' }}>
          kitz login
        </p>
        <h1 style={{ marginBottom: '0.5rem' }}>Entrar</h1>
        <p className="kz-mute" style={{ marginBottom: '1.5rem' }}>
          Código de 6 dígitos al correo. Sin contraseñas.
        </p>
        <div className="kz-divider" />
        <div style={{ marginTop: '1.5rem' }}>
          <Suspense fallback={<p className="kz-mute">cargando…</p>}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
