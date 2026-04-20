'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Stage = 'email' | 'code' | 'done';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get('next');
  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [nextTarget, setNextTarget] = useState('/workspace');

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
      const body = (await res.json()) as {
        success: boolean;
        data: { userId: string; next: string } | null;
        error: string | null;
      };
      if (!body.success) {
        const msg =
          body.error === 'invalid_code'
            ? 'Código incorrecto.'
            : body.error === 'expired'
              ? 'El código expiró. Pide uno nuevo.'
              : body.error === 'no_active_otp'
                ? 'No hay un código activo. Pide uno nuevo.'
                : body.error === 'too_many_attempts'
                  ? 'Demasiados intentos. Pide uno nuevo.'
                  : 'No pudimos verificar el código.';
        setError(msg);
        if (
          body.error === 'no_active_otp' ||
          body.error === 'expired' ||
          body.error === 'too_many_attempts'
        ) {
          setStage('email');
          setCode('');
          setDevCode(null);
        }
        return;
      }
      // Honour ?next=... if it points at an in-app path, otherwise fall
      // back to the server's recommendation (/onboarding for fresh users,
      // /workspace once a tenant exists).
      const safeNext =
        requestedNext && requestedNext.startsWith('/') && !requestedNext.startsWith('//')
          ? requestedNext
          : null;
      const next = safeNext ?? body.data?.next ?? '/workspace';
      setNextTarget(next);
      setStage('done');
      // Use a hard navigation here so the browser commits the just-set
      // session cookie before the destination's middleware reads it.
      // router.push() races with the Set-Cookie commit and can bounce
      // the user back to /login on the very first attempt.
      window.location.assign(next);
    } catch {
      setError('Fallo de red. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  if (stage === 'email') {
    return (
      <form onSubmit={submitEmail}>
        <label htmlFor="email" className="kz-label">
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
          className="kz-input"
          style={{ marginBottom: '1rem' }}
        />
        {error && (
          <p className="kz-error" style={{ marginBottom: '1rem' }}>
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className="kz-button">
          {loading ? 'Enviando…' : 'Enviar código'}
        </button>
      </form>
    );
  }

  if (stage === 'code') {
    return (
      <form onSubmit={submitCode}>
        <label htmlFor="code" className="kz-label">
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
          placeholder="······"
          className="kz-input kz-code-input"
          style={{ marginBottom: '1rem' }}
        />
        {devCode && (
          <p className="kz-mute" style={{ marginBottom: '1rem' }}>
            [dev] code = <span style={{ color: 'var(--kitz-text-strong)' }}>{devCode}</span>
          </p>
        )}
        {error && (
          <p className="kz-error" style={{ marginBottom: '1rem' }}>
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className="kz-button">
          {loading ? 'Verificando…' : 'Entrar'}
        </button>
      </form>
    );
  }

  return (
    <p className="kz-mute kz-prompt kz-caret">
      redirect → <span style={{ color: 'var(--kitz-text-strong)' }}>{nextTarget}</span>
    </p>
  );
}
