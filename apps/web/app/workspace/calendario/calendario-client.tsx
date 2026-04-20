'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { CalendarEvent } from '@kitz/db';

type ListResponse = { data: { items: CalendarEvent[] } | null };
type ItemResponse = { success: boolean; data: CalendarEvent | null; error: string | null };

function toLocalInput(iso: string): string {
  // datetime-local needs YYYY-MM-DDTHH:mm in the browser's TZ
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
}

function fromLocalInput(value: string): string {
  // value is YYYY-MM-DDTHH:mm in local TZ, convert to UTC ISO
  return new Date(value).toISOString();
}

function groupByDay(events: CalendarEvent[]): { day: string; items: CalendarEvent[] }[] {
  const map = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const day = e.start_at.slice(0, 10);
    const arr = map.get(day) ?? [];
    arr.push(e);
    map.set(day, arr);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, items]) => ({ day, items }));
}

function formatDay(iso: string): string {
  return new Date(iso + 'T12:00:00.000Z').toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) =>
    d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${fmt(s)} – ${fmt(e)}`;
}

export default function CalendarioClient() {
  const [items, setItems] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/calendar');
      const body = (await res.json()) as ListResponse;
      setItems(body.data?.items ?? []);
    } catch {
      setError('network_error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const grouped = useMemo(() => groupByDay(items), [items]);

  async function create(payload: Record<string, unknown>) {
    setError(null);
    const res = await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as ItemResponse;
    if (!json.success) {
      setError(json.error ?? 'create_failed');
      return;
    }
    setShowCreate(false);
    await reload();
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este evento?')) return;
    const res = await fetch(`/api/calendar/${id}`, { method: 'DELETE' });
    if (res.ok) await reload();
  }

  return (
    <section
      style={{
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        height: '100%',
        overflow: 'auto',
      }}
    >
      <header>
        <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Calendario</h1>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#666' }}>
          {items.length} evento{items.length === 1 ? '' : 's'} programado
          {items.length === 1 ? '' : 's'}.
        </p>
      </header>

      <div>
        <button
          type="button"
          className="kz-button"
          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.75rem' }}
          onClick={() => setShowCreate((v) => !v)}
        >
          {showCreate ? 'Cancelar' : 'Nuevo evento'}
        </button>
      </div>

      {error && <p className="kz-error">{error}</p>}
      {showCreate && <CreateForm onSubmit={create} />}

      {loading ? (
        <p className="kz-mute">cargando…</p>
      ) : grouped.length === 0 ? (
        <div className="kz-panel" style={{ padding: '1rem' }}>
          <p className="kz-mute">Sin eventos. Crea el primero arriba.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {grouped.map(({ day, items }) => (
            <div key={day} className="kz-panel" style={{ padding: '1rem' }}>
              <p className="kz-label" style={{ margin: 0, marginBottom: '0.5rem' }}>
                {formatDay(day)}
              </p>
              <ul
                style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.4rem' }}
              >
                {items.map((e) => (
                  <li
                    key={e.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '8rem 1fr auto',
                      gap: '0.75rem',
                      alignItems: 'baseline',
                      padding: '0.4rem 0',
                      borderTop: '1px solid var(--kitz-border)',
                    }}
                  >
                    <span className="kz-mute" style={{ fontSize: '0.75rem' }}>
                      {formatRange(e.start_at, e.end_at)}
                    </span>
                    <span style={{ color: 'var(--kitz-text-strong)' }}>
                      {e.title}
                      {e.location && (
                        <span
                          className="kz-mute"
                          style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}
                        >
                          @ {e.location}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(e.id)}
                      className="kz-button kz-button-ghost"
                      style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.65rem' }}
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CreateForm({
  onSubmit,
}: {
  onSubmit: (p: Record<string, unknown>) => void | Promise<void>;
}) {
  const now = new Date();
  const oneHour = new Date(now.getTime() + 60 * 60_000);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(toLocalInput(now.toISOString()));
  const [end, setEnd] = useState(toLocalInput(oneHour.toISOString()));
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        title,
        startAt: fromLocalInput(start),
        endAt: fromLocalInput(end),
        ...(location ? { location } : {}),
      });
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
        gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
      }}
    >
      <input
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título (ej. Reunión con Ken)"
        className="kz-input"
      />
      <input
        type="datetime-local"
        required
        value={start}
        onChange={(e) => setStart(e.target.value)}
        className="kz-input"
      />
      <input
        type="datetime-local"
        required
        value={end}
        onChange={(e) => setEnd(e.target.value)}
        className="kz-input"
      />
      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Lugar (opcional)"
        className="kz-input"
      />
      <button
        type="submit"
        disabled={saving}
        className="kz-button"
        style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.75rem' }}
      >
        {saving ? '…' : 'Crear'}
      </button>
    </form>
  );
}
