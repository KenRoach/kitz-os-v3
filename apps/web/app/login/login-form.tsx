'use client';

import { useState, type FormEvent } from 'react';

type Stage = 'email' | 'code' | 'done';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  fontSize: '1rem',
  border: '1px solid #d4d4d4',
  borderRadius: '8px',
  marginBottom: '0.75rem',
  boxSizing: 'border-box',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  fontSize: '1rem',
  fontWeight: 600,
  background: '#111',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
};

export default function LoginForm() {
  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  async function submitEmail(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = (await res.json()) as {
        success: boolean;
        data: { devCode?: string } | null;
        error: string | null;
      };
      if (!body.success) {
        setError(
          body.error === 'rate_limited'
            ? 'Demasiados intentos. Espera un momento.'
            : 'No pudimos enviar el código.',
        );
        return;
      }
      if (body.data?.devCode) setDevCode(body.data.devCode);
      setStage('code');
    } catch {
      setError('Fallo de red. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const body = (await res.json()) as { success: boolean; error: string | null };
      if (!body.success) {
        const msg =
          body.error === 'invalid_code'
            ? 'Código incorrecto.'
            : body.error === 'expired'
              ? 'El código expiró.'
              : body.error === 'too_many_attempts'
                ? 'Demasiados intentos. Pide uno nuevo.'
                : 'No pudimos verificar el código.';
        setError(msg);
        return;
      }
      setStage('done');
      window.location.href = '/workspace';
    } catch {
      setError('Fallo de red. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  if (stage === 'email') {
    return (
      <form onSubmit={submitEmail}>
        <label
          htmlFor="email"
          style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}
        >
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@empresa.com"
          style={inputStyle}
        />
        {error && (
          <p style={{ color: '#c00', margin: '0 0 0.75rem 0', fontSize: '0.875rem' }}>{error}</p>
        )}
        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? 'Enviando…' : 'Enviar código'}
        </button>
      </form>
    );
  }

  if (stage === 'code') {
    return (
      <form onSubmit={submitCode}>
        <label
          htmlFor="code"
          style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}
        >
          Código de 6 dígitos
        </label>
        <input
          id="code"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          required
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="123456"
          style={{
            ...inputStyle,
            letterSpacing: '0.5rem',
            textAlign: 'center',
            fontSize: '1.5rem',
          }}
        />
        {devCode && (
          <p style={{ fontSize: '0.75rem', color: '#888', margin: '0 0 0.75rem 0' }}>
            Modo desarrollo: tu código es <strong>{devCode}</strong>
          </p>
        )}
        {error && (
          <p style={{ color: '#c00', margin: '0 0 0.75rem 0', fontSize: '0.875rem' }}>{error}</p>
        )}
        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? 'Verificando…' : 'Entrar'}
        </button>
      </form>
    );
  }

  return <p>Entrando…</p>;
}
