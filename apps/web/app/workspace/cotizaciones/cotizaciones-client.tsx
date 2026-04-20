'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Invoice, InvoiceKind, InvoiceStatus, LineItem } from '@kitz/db';
import {
  INVOICE_KIND_LABELS,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUSES,
} from '@kitz/db/invoice-constants';

type ListResponse = { data: { items: Invoice[] } | null };
type ItemResponse = { success: boolean; data: Invoice | null; error: string | null };

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: '#777',
  sent: '#1a4',
  accepted: '#06c',
  paid: '#063',
  cancelled: '#a00',
  expired: '#a60',
};

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('es', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

type DraftItem = { description: string; quantity: string; unitPrice: string };

const EMPTY_ITEM: DraftItem = { description: '', quantity: '1', unitPrice: '0' };

export default function CotizacionesClient() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterKind, setFilterKind] = useState<'' | InvoiceKind>('');
  const [filterStatus, setFilterStatus] = useState<'' | InvoiceStatus>('');
  const [creating, setCreating] = useState(false);

  // Form state
  const [kind, setKind] = useState<InvoiceKind>('quote');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [taxRate, setTaxRate] = useState('0.07');
  const [currency, setCurrency] = useState('USD');
  const [draftItems, setDraftItems] = useState<DraftItem[]>([{ ...EMPTY_ITEM }]);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterKind) params.set('kind', filterKind);
      if (filterStatus) params.set('status', filterStatus);
      const r = await fetch(`/api/invoices?${params.toString()}`, { cache: 'no-store' });
      const j: ListResponse = await r.json();
      setItems(j.data?.items ?? []);
      setError(null);
    } catch {
      setError('load_failed');
    } finally {
      setLoading(false);
    }
  }, [filterKind, filterStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const addItem = () => setDraftItems((s) => [...s, { ...EMPTY_ITEM }]);
  const removeItem = (i: number) =>
    setDraftItems((s) => (s.length > 1 ? s.filter((_, idx) => idx !== i) : s));
  const updateItem = (i: number, patch: Partial<DraftItem>) =>
    setDraftItems((s) => s.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const previewTotals = useMemo(() => {
    const subtotal = draftItems.reduce((sum, it) => {
      const q = parseFloat(it.quantity) || 0;
      const p = parseFloat(it.unitPrice) || 0;
      return sum + q * p;
    }, 0);
    const rate = parseFloat(taxRate) || 0;
    const tax = subtotal * rate;
    return { subtotal, tax, total: subtotal + tax };
  }, [draftItems, taxRate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        kind,
        customerName: customerName.trim(),
        items: draftItems.map((it) => ({
          description: it.description.trim(),
          quantity: parseFloat(it.quantity) || 0,
          unitPrice: parseFloat(it.unitPrice) || 0,
        })),
        taxRate: parseFloat(taxRate) || 0,
        currency: currency.trim().toUpperCase(),
      };
      if (customerEmail.trim()) payload.customerEmail = customerEmail.trim();
      const r = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j: ItemResponse = await r.json();
      if (!r.ok || !j.success) {
        setError(j.error ?? 'create_failed');
        return;
      }
      // reset
      setCustomerName('');
      setCustomerEmail('');
      setDraftItems([{ ...EMPTY_ITEM }]);
      setCreating(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const onChangeStatus = async (id: string, next: InvoiceStatus) => {
    const r = await fetch(`/api/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    if (r.ok) await load();
  };

  const onDelete = async (id: string) => {
    if (!confirm('¿Eliminar este documento?')) return;
    const r = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
    if (r.ok) await load();
  };

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
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Cotizaciones / Facturas</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#666' }}>
            Documentos comerciales con líneas, totales y estado.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating((c) => !c)}
          style={{
            background: creating ? '#fff' : '#000',
            color: creating ? '#000' : '#fff',
            border: '1px solid #000',
            padding: '0.4rem 0.8rem',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          {creating ? 'Cancelar' : 'Nuevo documento'}
        </button>
      </header>

      {creating && (
        <form
          onSubmit={onSubmit}
          style={{
            border: '1px solid #000',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            background: '#fff',
          }}
        >
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
              <span style={{ fontSize: '0.7rem' }}>Tipo</span>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as InvoiceKind)}
                style={{ padding: '0.3rem', border: '1px solid #000', fontSize: '0.8rem' }}
              >
                <option value="quote">Cotización</option>
                <option value="invoice">Factura</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 2 }}>
              <span style={{ fontSize: '0.7rem' }}>Cliente</span>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                maxLength={200}
                style={{ padding: '0.3rem', border: '1px solid #000', fontSize: '0.8rem' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 2 }}>
              <span style={{ fontSize: '0.7rem' }}>Email (opcional)</span>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                style={{ padding: '0.3rem', border: '1px solid #000', fontSize: '0.8rem' }}
              />
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.7rem' }}>Líneas</span>
            {draftItems.map((it, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  placeholder="Descripción"
                  value={it.description}
                  onChange={(e) => updateItem(i, { description: e.target.value })}
                  required
                  style={{
                    flex: 3,
                    padding: '0.3rem',
                    border: '1px solid #000',
                    fontSize: '0.8rem',
                  }}
                />
                <input
                  type="number"
                  placeholder="Cant."
                  value={it.quantity}
                  onChange={(e) => updateItem(i, { quantity: e.target.value })}
                  min="0"
                  step="0.01"
                  style={{
                    flex: 1,
                    padding: '0.3rem',
                    border: '1px solid #000',
                    fontSize: '0.8rem',
                  }}
                />
                <input
                  type="number"
                  placeholder="Precio"
                  value={it.unitPrice}
                  onChange={(e) => updateItem(i, { unitPrice: e.target.value })}
                  min="0"
                  step="0.01"
                  style={{
                    flex: 1,
                    padding: '0.3rem',
                    border: '1px solid #000',
                    fontSize: '0.8rem',
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  disabled={draftItems.length === 1}
                  style={{
                    border: '1px solid #000',
                    background: '#fff',
                    padding: '0 0.5rem',
                    fontSize: '0.75rem',
                    cursor: draftItems.length === 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addItem}
              style={{
                alignSelf: 'flex-start',
                border: '1px dashed #000',
                background: '#fff',
                padding: '0.25rem 0.6rem',
                fontSize: '0.7rem',
                cursor: 'pointer',
              }}
            >
              + agregar línea
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.7rem' }}>Tasa impuesto (0–1)</span>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                style={{
                  width: '6rem',
                  padding: '0.3rem',
                  border: '1px solid #000',
                  fontSize: '0.8rem',
                }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.7rem' }}>Moneda</span>
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                maxLength={3}
                style={{
                  width: '4rem',
                  padding: '0.3rem',
                  border: '1px solid #000',
                  fontSize: '0.8rem',
                }}
              />
            </label>
            <div style={{ marginLeft: 'auto', fontSize: '0.75rem', textAlign: 'right' }}>
              <div>Subtotal: {formatMoney(previewTotals.subtotal, currency || 'USD')}</div>
              <div>Impuesto: {formatMoney(previewTotals.tax, currency || 'USD')}</div>
              <div style={{ fontWeight: 600 }}>
                Total: {formatMoney(previewTotals.total, currency || 'USD')}
              </div>
            </div>
          </div>

          {error && (
            <div style={{ fontSize: '0.75rem', color: '#a00' }}>Error: {error}</div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: '#000',
                color: '#fff',
                border: '1px solid #000',
                padding: '0.4rem 1rem',
                fontSize: '0.75rem',
                cursor: submitting ? 'wait' : 'pointer',
              }}
            >
              {submitting ? 'Guardando…' : 'Guardar borrador'}
            </button>
          </div>
        </form>
      )}

      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          fontSize: '0.75rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <span>Filtros:</span>
        <select
          value={filterKind}
          onChange={(e) => setFilterKind(e.target.value as '' | InvoiceKind)}
          style={{ padding: '0.25rem', border: '1px solid #000', fontSize: '0.75rem' }}
        >
          <option value="">Todos los tipos</option>
          <option value="quote">Cotizaciones</option>
          <option value="invoice">Facturas</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as '' | InvoiceStatus)}
          style={{ padding: '0.25rem', border: '1px solid #000', fontSize: '0.75rem' }}
        >
          <option value="">Todos los estados</option>
          {INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {INVOICE_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

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
          Sin documentos. Crea tu primera cotización o factura.
        </div>
      ) : (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.8rem',
            border: '1px solid #000',
          }}
        >
          <thead style={{ background: '#f4f4f4' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #000' }}>
                Número
              </th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #000' }}>
                Tipo
              </th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #000' }}>
                Cliente
              </th>
              <th style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid #000' }}>
                Total
              </th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #000' }}>
                Estado
              </th>
              <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #000' }}>
                Creado
              </th>
              <th style={{ padding: '0.5rem', borderBottom: '1px solid #000' }} />
            </tr>
          </thead>
          <tbody>
            {items.map((inv) => (
              <InvoiceRow
                key={inv.id}
                invoice={inv}
                onChangeStatus={onChangeStatus}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function InvoiceRow({
  invoice,
  onChangeStatus,
  onDelete,
}: {
  invoice: Invoice;
  onChangeStatus: (id: string, next: InvoiceStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr style={{ borderBottom: '1px solid #ddd' }}>
        <td style={{ padding: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              textDecoration: 'underline',
            }}
          >
            {invoice.number}
          </button>
        </td>
        <td style={{ padding: '0.5rem' }}>{INVOICE_KIND_LABELS[invoice.kind]}</td>
        <td style={{ padding: '0.5rem' }}>{invoice.customer_name}</td>
        <td style={{ padding: '0.5rem', textAlign: 'right' }}>
          {formatMoney(invoice.total, invoice.currency)}
        </td>
        <td style={{ padding: '0.5rem' }}>
          <select
            value={invoice.status}
            onChange={(e) => void onChangeStatus(invoice.id, e.target.value as InvoiceStatus)}
            style={{
              border: '1px solid #000',
              padding: '0.15rem 0.3rem',
              fontSize: '0.7rem',
              color: STATUS_COLORS[invoice.status],
              fontWeight: 600,
            }}
          >
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {INVOICE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </td>
        <td style={{ padding: '0.5rem', color: '#666' }}>{formatDate(invoice.created_at)}</td>
        <td style={{ padding: '0.5rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
          <button
            type="button"
            onClick={() =>
              // Opens the print-ready route in a second window —
              // AutoPrint fires the system print dialog on load so
              // users can "Save as PDF" with one click.
              window.open(`/print/cotizaciones/${invoice.id}`, '_blank', 'noopener,noreferrer')
            }
            style={{
              border: '1px solid #000',
              background: '#000',
              color: '#fff',
              padding: '0.15rem 0.5rem',
              fontSize: '0.7rem',
              cursor: 'pointer',
              marginRight: '0.35rem',
            }}
          >
            PDF
          </button>
          <button
            type="button"
            onClick={() => void onDelete(invoice.id)}
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
      {open && (
        <tr style={{ background: '#fafafa' }}>
          <td colSpan={7} style={{ padding: '0.75rem' }}>
            <LineItemsPreview items={invoice.items} currency={invoice.currency} />
            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem' }}>
              Subtotal: {formatMoney(invoice.subtotal, invoice.currency)} · Imp.{' '}
              {formatMoney(invoice.tax, invoice.currency)} · Total{' '}
              <strong>{formatMoney(invoice.total, invoice.currency)}</strong>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function LineItemsPreview({ items, currency }: { items: LineItem[]; currency: string }) {
  return (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.75rem',
      }}
    >
      <thead>
        <tr style={{ borderBottom: '1px solid #ccc' }}>
          <th style={{ textAlign: 'left', padding: '0.25rem' }}>Descripción</th>
          <th style={{ textAlign: 'right', padding: '0.25rem', width: '4rem' }}>Cant.</th>
          <th style={{ textAlign: 'right', padding: '0.25rem', width: '6rem' }}>Precio</th>
          <th style={{ textAlign: 'right', padding: '0.25rem', width: '6rem' }}>Subtotal</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it, i) => (
          <tr key={i}>
            <td style={{ padding: '0.25rem' }}>{it.description}</td>
            <td style={{ padding: '0.25rem', textAlign: 'right' }}>{it.quantity}</td>
            <td style={{ padding: '0.25rem', textAlign: 'right' }}>
              {formatMoney(it.unitPrice, currency)}
            </td>
            <td style={{ padding: '0.25rem', textAlign: 'right' }}>
              {formatMoney(it.quantity * it.unitPrice, currency)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
