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
        fontFamily: 'system-ui, sans-serif',
        padding: '2rem',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '28rem',
          padding: '2.5rem',
          border: '1px solid #eaeaea',
          borderRadius: '12px',
        }}
      >
        <h1 style={{ fontSize: '1.75rem', margin: '0 0 0.25rem 0' }}>KitZ</h1>
        <p style={{ margin: '0 0 2rem 0', color: '#666' }}>
          Entra con tu correo. Te enviamos un código de 6 dígitos.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
