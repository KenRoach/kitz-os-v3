'use client';

import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import type { DocumentRecord, DocumentKind, DocumentStatus } from '@kitz/db';
import {
  DOCUMENT_KINDS,
  DOCUMENT_KIND_LABELS,
  DOCUMENT_STATUSES,
  DOCUMENT_STATUS_LABELS,
} from '@kitz/db/document-kinds';

type ListResponse = { data: { items: DocumentRecord[] } | null };
type ItemResponse = { success: boolean; data: DocumentRecord | null; error: string | null };

const STATUS_COLORS: Record<DocumentStatus, string> = {
  uploaded: '#666',
  extracting: '#06c',
  extracted: '#063',
  failed: '#a00',
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DocumentosClient() {
  const [items, setItems] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterKind, setFilterKind] = useState<'' | DocumentKind>('');
  const [filterStatus, setFilterStatus] = useState<'' | DocumentStatus>('');
  const [error, setError] = useState<string | null>(null);

  // Upload form state
  const [kind, setKind] = useState<DocumentKind>('receipt');
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterKind) params.set('kind', filterKind);
      if (filterStatus) params.set('status', filterStatus);
      const r = await fetch(`/api/documents?${params.toString()}`, { cache: 'no-store' });
      const j: ListResponse = await r.json();
      setItems(j.data?.items ?? []);
    } catch {
      setError('load_failed');
    } finally {
      setLoading(false);
    }
  }, [filterKind, filterStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const onPickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('pick_a_file');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind,
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          notes: notes.trim() || undefined,
        }),
      });
      const j: ItemResponse = await r.json();
      if (!r.ok || !j.success) {
        setError(j.error ?? 'create_failed');
        return;
      }
      setFile(null);
      setNotes('');
      if (j.data) setSelected(j.data.id);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('¿Eliminar este documento?')) return;
    const r = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    if (r.ok) {
      if (selected === id) setSelected(null);
      await load();
    }
  };

  const selectedDoc = items.find((d) => d.id === selected) ?? null;

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
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Documentos / OCR</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#666' }}>
            Sube IDs, recibos, facturas o contratos. Kitz extrae los campos automáticamente.
          </p>
        </div>
      </header>

      <form
        onSubmit={onSubmit}
        style={{
          border: '1px solid #000',
          padding: '1rem',
          background: '#fff',
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.7rem' }}>Tipo</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as DocumentKind)}
            style={{ padding: '0.3rem', border: '1px solid #000', fontSize: '0.8rem' }}
          >
            {DOCUMENT_KINDS.map((k) => (
              <option key={k} value={k}>
                {DOCUMENT_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: '14rem' }}>
          <span style={{ fontSize: '0.7rem' }}>Archivo</span>
          <input
            type="file"
            onChange={onPickFile}
            accept="image/*,application/pdf"
            style={{ padding: '0.3rem', border: '1px solid #000', fontSize: '0.75rem' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 2, minWidth: '14rem' }}>
          <span style={{ fontSize: '0.7rem' }}>Notas (opcional)</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1000}
            style={{ padding: '0.3rem', border: '1px solid #000', fontSize: '0.8rem' }}
          />
        </label>
        <button
          type="submit"
          disabled={submitting || !file}
          style={{
            background: '#000',
            color: '#fff',
            border: '1px solid #000',
            padding: '0.4rem 1rem',
            fontSize: '0.75rem',
            cursor: submitting || !file ? 'not-allowed' : 'pointer',
            opacity: submitting || !file ? 0.6 : 1,
          }}
        >
          {submitting ? 'Procesando…' : 'Subir + Extraer'}
        </button>
      </form>

      {error && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            border: '1px solid #a00',
            background: '#fff4f4',
            fontSize: '0.75rem',
            color: '#a00',
          }}
        >
          Error: {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span>Filtros:</span>
        <select
          value={filterKind}
          onChange={(e) => setFilterKind(e.target.value as '' | DocumentKind)}
          style={{ padding: '0.25rem', border: '1px solid #000', fontSize: '0.75rem' }}
        >
          <option value="">Todos los tipos</option>
          {DOCUMENT_KINDS.map((k) => (
            <option key={k} value={k}>
              {DOCUMENT_KIND_LABELS[k]}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as '' | DocumentStatus)}
          style={{ padding: '0.25rem', border: '1px solid #000', fontSize: '0.75rem' }}
        >
          <option value="">Todos los estados</option>
          {DOCUMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {DOCUMENT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', minHeight: 0 }}>
        <div>
          {loading ? (
            <div style={{ fontSize: '0.8rem', color: '#666' }}>Cargando…</div>
          ) : items.length === 0 ? (
            <div
              style={{
                padding: '2rem',
                border: '1px dashed #999',
                textAlign: 'center',
                fontSize: '0.85rem',
                color: '#666',
              }}
            >
              Sin documentos. Sube tu primer archivo arriba.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', border: '1px solid #000' }}>
              <thead style={{ background: '#f4f4f4' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #000' }}>Archivo</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #000' }}>Tipo</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #000' }}>Estado</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid #000' }}>Tamaño</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #000' }}>Subido</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid #000' }} />
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => setSelected(d.id)}
                    style={{
                      borderBottom: '1px solid #ddd',
                      background: selected === d.id ? '#f9f9f9' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <td style={{ padding: '0.5rem', maxWidth: '14rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.filename}
                    </td>
                    <td style={{ padding: '0.5rem' }}>{DOCUMENT_KIND_LABELS[d.kind]}</td>
                    <td style={{ padding: '0.5rem', color: STATUS_COLORS[d.status], fontWeight: 600 }}>
                      {DOCUMENT_STATUS_LABELS[d.status]}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatBytes(d.size_bytes)}</td>
                    <td style={{ padding: '0.5rem', color: '#666' }}>{formatDate(d.created_at)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void onDelete(d.id);
                        }}
                        style={{
                          border: '1px solid #a00',
                          background: '#fff',
                          color: '#a00',
                          padding: '0.15rem 0.5rem',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                        }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <aside
          style={{
            border: '1px solid #000',
            background: '#fff',
            padding: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            fontSize: '0.75rem',
            minHeight: '12rem',
          }}
        >
          <header style={{ borderBottom: '1px solid #ddd', paddingBottom: '0.4rem' }}>
            <h2 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600 }}>Datos extraídos</h2>
          </header>
          {selectedDoc ? (
            <ExtractedView doc={selectedDoc} />
          ) : (
            <p style={{ margin: 0, color: '#666' }}>
              Selecciona un documento para ver sus campos.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}

function ExtractedView({ doc }: { doc: DocumentRecord }) {
  if (doc.status === 'failed') {
    return (
      <div>
        <p style={{ margin: 0, color: '#a00' }}>Falló: {doc.extract_error ?? 'desconocido'}</p>
      </div>
    );
  }
  if (doc.status !== 'extracted' || !doc.extracted_data) {
    return <p style={{ margin: 0, color: '#666' }}>{DOCUMENT_STATUS_LABELS[doc.status]}…</p>;
  }
  const entries = Object.entries(doc.extracted_data);
  return (
    <dl
      style={{
        margin: 0,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        rowGap: '0.3rem',
        columnGap: '0.6rem',
      }}
    >
      {entries.map(([k, v]) => (
        <FieldRow key={k} label={k} value={v} />
      ))}
    </dl>
  );
}

function FieldRow({ label, value }: { label: string; value: unknown }) {
  return (
    <>
      <dt style={{ color: '#666', textTransform: 'capitalize' }}>{label.replace(/_/g, ' ')}</dt>
      <dd style={{ margin: 0, fontWeight: 600, wordBreak: 'break-word' }}>
        {Array.isArray(value) || (typeof value === 'object' && value !== null) ? (
          <pre style={{ margin: 0, fontSize: '0.7rem', background: '#fafafa', padding: '0.3rem', overflow: 'auto' }}>
            {JSON.stringify(value, null, 2)}
          </pre>
        ) : (
          String(value)
        )}
      </dd>
    </>
  );
}
