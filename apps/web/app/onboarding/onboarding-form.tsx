'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { WORK_PACKS, type WorkPackSlug } from '@kitz/agents/work-packs';
import { slugify } from '@/lib/onboarding/slug';

const DEFAULT_PACK: WorkPackSlug = 'general';

export default function OnboardingForm() {
  const [workspaceName, setWorkspaceName] = useState('');
  const [fullName, setFullName] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [workPack, setWorkPack] = useState<WorkPackSlug>(DEFAULT_PACK);
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
          workPack,
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

      <p className="kz-label" style={{ marginBottom: '0.5rem' }}>
        ¿Qué quieres que haga KitZ por ti?
      </p>
      <div
        role="radiogroup"
        aria-label="Tipo de trabajo"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(13rem, 1fr))',
          gap: '0.5rem',
          marginBottom: '1.25rem',
        }}
      >
        {WORK_PACKS.map((pack) => {
          const active = pack.slug === workPack;
          return (
            <button
              key={pack.slug}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setWorkPack(pack.slug)}
              style={{
                textAlign: 'left',
                padding: '0.65rem 0.75rem',
                border: '1px solid var(--kitz-border)',
                background: active ? 'var(--kitz-text-strong)' : 'var(--kitz-bg)',
                color: active ? 'var(--kitz-bg)' : 'var(--kitz-text-strong)',
                cursor: 'pointer',
                fontFamily: 'var(--kitz-font-mono)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{pack.name}</span>
              <span
                style={{
                  fontSize: '0.65rem',
                  opacity: 0.85,
                  lineHeight: 1.35,
                }}
              >
                {pack.tagline}
              </span>
            </button>
          );
        })}
      </div>

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
