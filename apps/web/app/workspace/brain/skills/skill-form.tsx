'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { Skill } from '@kitz/db';
import { SKILL_KINDS, SKILL_KIND_LABELS, type SkillKind } from '@kitz/db/skill-kinds';

type Props = {
  skill?: Skill;
  mode: 'create' | 'edit';
  onSubmit: (body: Record<string, unknown>) => void | Promise<void>;
  onDelete?: () => void;
};

type FormState = {
  slug: string;
  name: string;
  description: string;
  kind: SkillKind;
  source: string;
  metadata: string;
};

function emptyForm(): FormState {
  return {
    slug: '',
    name: '',
    description: '',
    kind: 'mcp_file',
    source: '',
    metadata: '',
  };
}

function fromSkill(s: Skill): FormState {
  return {
    slug: s.slug,
    name: s.name,
    description: s.description ?? '',
    kind: s.kind,
    source: s.source,
    metadata: Object.keys(s.metadata).length > 0 ? JSON.stringify(s.metadata, null, 2) : '',
  };
}

function parseMetadata(raw: string): { ok: true; value: Record<string, unknown> } | { ok: false } {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: true, value: {} };
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ok: false };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false };
  }
}

export default function SkillForm({ skill, mode, onSubmit, onDelete }: Props) {
  const [form, setForm] = useState<FormState>(() => (skill ? fromSkill(skill) : emptyForm()));
  const [saving, setSaving] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    setForm(skill ? fromSkill(skill) : emptyForm());
    setJsonError(null);
  }, [skill]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const md = parseMetadata(form.metadata);
    if (!md.ok) {
      setJsonError('Metadata debe ser JSON válido (un objeto).');
      return;
    }
    setJsonError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        description: form.description || null,
        kind: form.kind,
        source: form.source,
        metadata: md.value,
      };
      if (mode === 'create') body['slug'] = form.slug;
      await onSubmit(body);
    } finally {
      setSaving(false);
    }
  }

  const sourcePlaceholder =
    form.kind === 'webhook'
      ? 'https://example.com/hook'
      : form.kind === 'prompt_chain'
        ? 'chain-id o referencia interna'
        : 'mcp://kitz/lookup-customer';

  return (
    <form
      onSubmit={submit}
      className="kz-panel"
      style={{ padding: '1.25rem', display: 'grid', gap: '0.75rem' }}
    >
      <p className="kz-mute kz-prompt" style={{ margin: 0 }}>
        kitz skill · {mode}
      </p>

      {mode === 'create' && (
        <>
          <label className="kz-label">Slug (a-z, 0-9, guiones)</label>
          <input
            required
            minLength={2}
            maxLength={64}
            pattern="[a-z0-9](?:[a-z0-9\-]*[a-z0-9])?"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
            placeholder="lookup-customer"
            className="kz-input"
          />
        </>
      )}

      <label className="kz-label">Nombre</label>
      <input
        required
        minLength={1}
        maxLength={120}
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="Buscar cliente"
        className="kz-input"
      />

      <label className="kz-label">Descripción (opcional)</label>
      <input
        maxLength={400}
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="Qué hace este skill"
        className="kz-input"
      />

      <label className="kz-label">Tipo</label>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {SKILL_KINDS.map((k) => {
          const active = form.kind === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setForm({ ...form, kind: k })}
              style={{
                padding: '0.35rem 0.7rem',
                border: '1px solid var(--kitz-border)',
                background: active ? 'var(--kitz-text-strong)' : 'var(--kitz-bg)',
                color: active ? 'var(--kitz-bg)' : 'var(--kitz-text)',
                fontFamily: 'var(--kitz-font-mono)',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              {SKILL_KIND_LABELS[k]}
            </button>
          );
        })}
      </div>

      <label className="kz-label">Source</label>
      <input
        required
        minLength={1}
        maxLength={2000}
        value={form.source}
        onChange={(e) => setForm({ ...form, source: e.target.value })}
        placeholder={sourcePlaceholder}
        className="kz-input"
      />

      <label className="kz-label">Metadata (JSON, opcional)</label>
      <textarea
        value={form.metadata}
        onChange={(e) => setForm({ ...form, metadata: e.target.value })}
        rows={4}
        className="kz-input"
        placeholder='{"timeoutMs": 5000}'
        style={{
          fontFamily: 'var(--kitz-font-mono)',
          resize: 'vertical',
          minHeight: '5rem',
        }}
      />

      {jsonError && <p className="kz-error">{jsonError}</p>}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        <button
          type="submit"
          disabled={saving}
          className="kz-button"
          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.75rem' }}
        >
          {saving ? '…' : mode === 'create' ? 'Crear skill' : 'Guardar'}
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            className="kz-button kz-button-ghost"
            style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.75rem' }}
          >
            Eliminar
          </button>
        )}
      </div>
    </form>
  );
}
