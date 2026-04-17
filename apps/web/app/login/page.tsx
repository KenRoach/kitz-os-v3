import LoginForm from './login-form';

export const metadata = {
  title: 'Entrar · KitZ',
};

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
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
