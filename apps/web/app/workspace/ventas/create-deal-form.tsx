'use client';

import { useState, type FormEvent } from 'react';
import type { Deal } from '@kitz/db';
import { DEAL_STAGES, type DealStage } from '@kitz/db/deal-stages';

export default function CreateDealForm({ onCreated }: { onCreated: (d: Deal) => void }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [stage, setStage] = useState<DealStage>('prospecto');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title,
          amount: amount ? Number(amount) : 0,
          currency: currency.toUpperCase(),
          stage,
        }),
      });
      const body = (await res.json()) as {
        success: boolean;
        data: Deal | null;
        error: string | null;
      };
      if (!body.success || !body.data) {
        setError(body.error ?? 'unknown');
        return;
      }
      setTitle('');
      setAmount('');
      setStage('prospecto');
      onCreated(body.data);
    } catch {
      setError('network_error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="kz-panel"
      style={{
        padding: '1rem',
        display: 'grid',
        gap: '0.5rem',
        gridTemplateColumns: '2fr 1fr 0.5fr 1.2fr auto',
      }}
    >
      <input
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título (ej. Acme Q1 renewal)"
        className="kz-input"
      />
      <input
        type="number"
        min={0}
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Monto"
        className="kz-input"
      />
      <input
        maxLength={3}
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        className="kz-input"
      />
      <select
        value={stage}
        onChange={(e) => setStage(e.target.value as DealStage)}
        className="kz-input"
      >
        {DEAL_STAGES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={saving}
        className="kz-button"
        style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.75rem' }}
      >
        {saving ? '…' : 'Crear'}
      </button>
      {error && (
        <p className="kz-error" style={{ gridColumn: '1 / -1', margin: 0 }}>
          {error}
        </p>
      )}
    </form>
  );
}
