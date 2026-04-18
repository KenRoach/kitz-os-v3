'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Agent } from '@kitz/db';
import type { ToolDef } from '@kitz/agents';
import AgentList from './agent-list';
import AgentForm from './agent-form';

type ToolsResponse = { data: { tools: ToolDef[] } | null };
type ListResponse = { data: { items: Agent[]; activeId: string | null } | null };
type ItemResponse = { data: Agent | null; error: string | null; success: boolean };

export default function AgentsClient() {
  const [tools, setTools] = useState<ToolDef[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [toolsRes, listRes] = await Promise.all([
        fetch('/api/agents/tools'),
        fetch('/api/agents'),
      ]);
      const toolsBody = (await toolsRes.json()) as ToolsResponse;
      const listBody = (await listRes.json()) as ListResponse;
      setTools(toolsBody.data?.tools ?? []);
      setAgents(listBody.data?.items ?? []);
      setActiveId(listBody.data?.activeId ?? null);
      if (!selectedId && listBody.data?.items.length) {
        setSelectedId(listBody.data.items[0]?.id ?? null);
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

  const selected = agents.find((a) => a.id === selectedId) ?? null;

  async function activate(id: string) {
    const res = await fetch(`/api/agents/${id}/activate`, { method: 'POST' });
    if (res.ok) await reload();
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setError(null);
    const res = await fetch(`/api/agents/${id}`, {
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
    if (!confirm('¿Eliminar este agente?')) return;
    const res = await fetch(`/api/agents/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setSelectedId(null);
      await reload();
    }
  }

  async function create(body: Record<string, unknown>) {
    setError(null);
    const res = await fetch('/api/agents', {
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
          kitz agents
        </p>
        <h1 style={{ marginBottom: '0.25rem' }}>Agentes</h1>
        <p className="kz-mute">
          {agents.length} agente{agents.length === 1 ? '' : 's'} · activo{' '}
          {agents.find((a) => a.id === activeId)?.name ?? '—'}
        </p>
      </header>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          type="button"
          className="kz-button"
          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.75rem' }}
          onClick={() => setShowCreate((v) => !v)}
        >
          {showCreate ? 'Cancelar' : 'Nuevo agente'}
        </button>
      </div>

      {error && <p className="kz-error">{error}</p>}

      {showCreate && <AgentForm tools={tools} onSubmit={create} mode="create" key="create-form" />}

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
          <AgentList
            agents={agents}
            activeId={activeId}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onActivate={activate}
          />
          {selected ? (
            <AgentForm
              tools={tools}
              agent={selected}
              mode="edit"
              key={selected.id}
              onSubmit={(body) => patch(selected.id, body)}
              onDelete={() => remove(selected.id)}
            />
          ) : (
            <div className="kz-panel" style={{ padding: '1rem' }}>
              <p className="kz-mute kz-prompt">kitz agent</p>
              <p className="kz-mute" style={{ marginTop: '0.5rem' }}>
                Selecciona un agente o crea uno nuevo.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
