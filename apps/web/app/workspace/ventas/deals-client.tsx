'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Deal } from '@kitz/db';
import { DEAL_STAGES, type DealStage } from '@kitz/db/deal-stages';
import DealPipeline from './deal-pipeline';
import CreateDealForm from './create-deal-form';

type Summary = {
  byStage: Record<DealStage, { count: number; total: number }>;
  pipelineValue: number;
};

export default function DealsClient() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/deals');
      const body = (await res.json()) as {
        success: boolean;
        data: { items: Deal[]; summary: Summary } | null;
        error: string | null;
      };
      if (!body.success || !body.data) {
        setError(body.error ?? 'unknown');
        return;
      }
      setDeals(body.data.items);
      setSummary(body.data.summary);
    } catch {
      setError('network_error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function moveDeal(dealId: string, stage: DealStage) {
    const prior = deals;
    setDeals((xs) => xs.map((d) => (d.id === dealId ? { ...d, stage } : d)));
    const res = await fetch(`/api/deals/${dealId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ stage }),
    });
    if (!res.ok) {
      setDeals(prior);
      setError('update_failed');
      return;
    }
    await load();
  }

  async function removeDeal(id: string) {
    if (!confirm('¿Eliminar este trato?')) return;
    const res = await fetch(`/api/deals/${id}`, { method: 'DELETE' });
    if (res.ok) await load();
  }

  const pipelineUsd = summary ? Math.round(summary.pipelineValue) : 0;

  return (
    <section style={{ padding: '2rem', display: 'grid', gap: '1.5rem' }}>
      <header>
        <p className="kz-mute kz-prompt" style={{ marginBottom: '0.5rem' }}>
          kitz sales
        </p>
        <h1 style={{ marginBottom: '0.25rem' }}>Ventas</h1>
        <p className="kz-mute">
          Pipeline · {deals.length} tratos · {pipelineUsd.toLocaleString()} pendientes
        </p>
      </header>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button
          type="button"
          className="kz-button"
          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.75rem' }}
          onClick={() => setShowCreate((v) => !v)}
        >
          {showCreate ? 'Cancelar' : 'Nuevo trato'}
        </button>
      </div>

      {showCreate && (
        <CreateDealForm
          onCreated={async () => {
            setShowCreate(false);
            await load();
          }}
        />
      )}

      {error && <p className="kz-error">{error}</p>}

      {loading ? (
        <p className="kz-mute">cargando…</p>
      ) : (
        <DealPipeline
          stages={DEAL_STAGES}
          deals={deals}
          summary={summary?.byStage ?? null}
          onMove={moveDeal}
          onDelete={removeDeal}
        />
      )}
    </section>
  );
}
