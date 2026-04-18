'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Agent } from '@kitz/db';
import { AGENT_MODELS, type AgentModel } from '@kitz/db/agent-models';
import { AGENT_MODEL_LABELS } from '@kitz/db/agent-models';
import type { ToolDef } from '@kitz/agents';

type Props = {
  tools: ToolDef[];
  agent?: Agent;
  mode: 'create' | 'edit';
  onSubmit: (body: Record<string, unknown>) => void | Promise<void>;
  onDelete?: () => void;
};

type FormState = {
  slug: string;
  name: string;
  description: string;
  systemPrompt: string;
  model: AgentModel;
  tools: Set<string>;
  isActive: boolean;
};

function emptyForm(): FormState {
  return {
    slug: '',
    name: '',
    description: '',
    systemPrompt: '',
    model: 'haiku',
    tools: new Set(),
    isActive: false,
  };
}

function fromAgent(a: Agent): FormState {
  return {
    slug: a.slug,
    name: a.name,
    description: a.description ?? '',
    systemPrompt: a.system_prompt,
    model: a.model,
    tools: new Set(a.tools),
    isActive: a.is_active,
  };
}

export default function AgentForm({ tools, agent, mode, onSubmit, onDelete }: Props) {
  const [form, setForm] = useState<FormState>(() => (agent ? fromAgent(agent) : emptyForm()));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(agent ? fromAgent(agent) : emptyForm());
  }, [agent]);

  const grouped = useMemo(() => {
    const map = new Map<string, ToolDef[]>();
    for (const t of tools) {
      const list = map.get(t.category) ?? [];
      list.push(t);
      map.set(t.category, list);
    }
    return Array.from(map.entries());
  }, [tools]);

  function toggleTool(id: string) {
    setForm((prev) => {
      const next = new Set(prev.tools);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, tools: next };
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        description: form.description || null,
        systemPrompt: form.systemPrompt,
        model: form.model,
        tools: Array.from(form.tools),
        isActive: form.isActive,
      };
      if (mode === 'create') body['slug'] = form.slug;
      await onSubmit(body);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="kz-panel"
      style={{ padding: '1.25rem', display: 'grid', gap: '0.75rem' }}
    >
      <p className="kz-mute kz-prompt" style={{ margin: 0 }}>
        kitz agent · {mode}
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
            placeholder="kitz, luna, recepcionista…"
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
        placeholder="Kitz · Asistente"
        className="kz-input"
      />

      <label className="kz-label">Descripción (opcional)</label>
      <input
        maxLength={400}
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="Para qué sirve este agente"
        className="kz-input"
      />

      <label className="kz-label">System prompt</label>
      <textarea
        required
        minLength={4}
        maxLength={8000}
        value={form.systemPrompt}
        onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
        rows={6}
        className="kz-input"
        placeholder="Eres Kitz, hablas español, eres directo…"
        style={{ fontFamily: 'var(--kitz-font-mono)', resize: 'vertical', minHeight: '8rem' }}
      />

      <label className="kz-label">Modelo</label>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {AGENT_MODELS.map((m) => {
          const active = form.model === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setForm({ ...form, model: m })}
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
              {AGENT_MODEL_LABELS[m]}
            </button>
          );
        })}
      </div>

      <label className="kz-label">
        Herramientas ({form.tools.size}/{tools.length})
      </label>
      <div
        style={{
          border: '1px solid var(--kitz-border)',
          padding: '0.5rem',
          maxHeight: '14rem',
          overflowY: 'auto',
          display: 'grid',
          gap: '0.6rem',
        }}
      >
        {grouped.map(([cat, items]) => (
          <div key={cat}>
            <p className="kz-label" style={{ margin: '0 0 0.25rem 0', fontSize: '0.6rem' }}>
              {cat}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {items.map((t) => {
                const checked = form.tools.has(t.id);
                return (
                  <label
                    key={t.id}
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'flex-start',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTool(t.id)}
                      style={{ marginTop: '0.15rem' }}
                    />
                    <span style={{ flex: 1 }}>
                      <span style={{ color: 'var(--kitz-text-strong)' }}>{t.name}</span>{' '}
                      <span className="kz-mute" style={{ fontSize: '0.65rem' }}>
                        · {t.scope}
                      </span>
                      <br />
                      <span className="kz-mute" style={{ fontSize: '0.65rem' }}>
                        {t.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <label
        style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center',
          cursor: 'pointer',
          fontSize: '0.8rem',
          marginTop: '0.25rem',
        }}
      >
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
        />
        <span>Marcar como agente activo del espacio</span>
      </label>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        <button
          type="submit"
          disabled={saving}
          className="kz-button"
          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.75rem' }}
        >
          {saving ? '…' : mode === 'create' ? 'Crear agente' : 'Guardar'}
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
