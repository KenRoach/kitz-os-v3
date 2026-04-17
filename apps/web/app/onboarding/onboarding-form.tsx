'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { slugify } from '@/lib/onboarding/slug';

export default function OnboardingForm() {
  const [workspaceName, setWorkspaceName] = useState('');
  const [fullName, setFullName] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const previewSlug = useMemo(() => {
    const source = customSlug.trim() || workspaceName;
    return slugify(source) || '…';
  }, [customSlug, workspaceName]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          workspaceName,
          fullName,
          ...(customSlug ? { preferredSlug: customSlug } : {}),
        }),
      });
      const body = (await res.json()) as {
        success: boolean;
        data: { slug: string } | null;
        error: string | null;
      };
      if (!body.success) {
        const msg =
          body.error === 'invalid_name'
            ? 'Nombre inválido.'
            : body.error === 'invalid_slug'
              ? 'Slug inválido.'
              : body.error === 'already_onboarded'
                ? 'Ya tienes un espacio.'
                : body.error === 'unauthenticated'
                  ? 'Sesión expirada.'
                  : 'No pudimos crear tu espacio.';
        setError(msg);
        return;
      }
      window.location.href = '/workspace';
    } catch {
      setError('Fallo de red. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="full" className="kz-label">
        Tu nombre completo
      </label>
      <input
        id="full"
        type="text"
        required
        minLength={2}
        maxLength={120}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Ken Roach"
        className="kz-input"
        style={{ marginBottom: '1.25rem' }}
      />

      <label htmlFor="workspace" className="kz-label">
        Nombre del espacio
      </label>
      <input
        id="workspace"
        type="text"
        required
        minLength={2}
        maxLength={120}
        value={workspaceName}
        onChange={(e) => setWorkspaceName(e.target.value)}
        placeholder="Acme Corp"
        className="kz-input"
        style={{ marginBottom: '1.25rem' }}
      />

      <label htmlFor="slug" className="kz-label">
        URL personalizada (opcional)
      </label>
      <input
        id="slug"
        type="text"
        maxLength={64}
        value={customSlug}
        onChange={(e) => setCustomSlug(e.target.value)}
        placeholder={slugify(workspaceName) || 'mi-espacio'}
        className="kz-input"
        style={{ marginBottom: '0.5rem' }}
      />
      <p className="kz-mute" style={{ marginBottom: '1.25rem' }}>
        workspace.kitz.services/
        <span style={{ color: 'var(--kitz-text-strong)' }}>{previewSlug}</span>
      </p>

      {error && (
        <p className="kz-error" style={{ marginBottom: '1rem' }}>
          {error}
        </p>
      )}
      <button type="submit" disabled={loading} className="kz-button">
        {loading ? 'Creando…' : 'Crear espacio →'}
      </button>
    </form>
  );
}
