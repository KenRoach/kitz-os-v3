'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Skill } from '@kitz/db';
import SkillList from './skill-list';
import SkillForm from './skill-form';

type ListResponse = { data: { items: Skill[] } | null };
type ItemResponse = { success: boolean; data: Skill | null; error: string | null };

export default function SkillsClient() {
  const [items, setItems] = useState<Skill[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/skills');
      const body = (await res.json()) as ListResponse;
      setItems(body.data?.items ?? []);
      if (!selectedId && body.data?.items.length) {
        setSelectedId(body.data.items[0]?.id ?? null);
      }
    } catch {
      setError('network_error');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const selected = items.find((s) => s.id === selectedId) ?? null;

  async function create(body: Record<string, unknown>) {
    setError(null);
    const res = await fetch('/api/skills', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as ItemResponse;
    if (!json.success || !json.data) {
      setError(json.error ?? 'create_failed');
      return;
    }
    setShowCreate(false);
    setSelectedId(json.data.id);
    await reload();
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setError(null);
    const res = await fetch(`/api/skills/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as ItemResponse;
    if (!json.success) {
      setError(json.error ?? 'update_failed');
      return;
    }
    await reload();
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este skill?')) return;
    const res = await fetch(`/api/skills/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setSelectedId(null);
      await reload();
    }
  }

  return (
    <section
      style={{
        padding: '2rem',
        display: 'grid',
        gap: '1.5rem',
        maxWidth: '80rem',
        width: '100%',
        margin: '0 auto',
      }}
    >
      <header>
        <p className="kz-mute kz-prompt" style={{ marginBottom: '0.5rem' }}>
          kitz skills
        </p>
        <h1 style={{ marginBottom: '0.25rem' }}>Skills</h1>
        <p className="kz-mute">
          {items.length} skill{items.length === 1 ? '' : 's'} registrado
          {items.length === 1 ? '' : 's'}
        </p>
        <p className="kz-mute" style={{ marginTop: '0.5rem', maxWidth: '48rem' }}>
          Un skill es una capacidad reusable: un archivo MCP, una cadena de prompts, o un webhook.
          Los agentes lo referencian por id en su lista de skills.
        </p>
      </header>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          type="button"
          className="kz-button"
          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.75rem' }}
          onClick={() => setShowCreate((v) => !v)}
        >
          {showCreate ? 'Cancelar' : 'Nuevo skill'}
        </button>
      </div>

      {error && <p className="kz-error">{error}</p>}

      {showCreate && <SkillForm mode="create" onSubmit={create} key="create-form" />}

      {loading ? (
        <p className="kz-mute">cargando…</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(16rem, 22rem) 1fr',
            gap: '1.5rem',
            alignItems: 'start',
          }}
        >
          <SkillList items={items} selectedId={selectedId} onSelect={setSelectedId} />
          {selected ? (
            <SkillForm
              mode="edit"
              skill={selected}
              key={selected.id}
              onSubmit={(body) => patch(selected.id, body)}
              onDelete={() => remove(selected.id)}
            />
          ) : (
            <div className="kz-panel" style={{ padding: '1rem' }}>
              <p className="kz-mute kz-prompt">kitz skill</p>
              <p className="kz-mute" style={{ marginTop: '0.5rem' }}>
                Selecciona un skill o crea uno nuevo.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
