'use client';

/**
 * Brand settings form.
 *
 * Logo upload is local: browser reads the File as a data URL and we
 * store it on the BrandSettings row. Keeps the quoter-to-PDF flow
 * working with zero upload infrastructure. When Supabase Storage
 * lands, swap the FileReader step for a proper upload → stored URL.
 *
 * 2MB cap matches the server schema so users don't silently lose
 * edits on oversized logos.
 */

import { useState, type FormEvent } from 'react';
import type { BrandSettings } from '@/lib/brand/store';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export function BrandForm({ initial }: { initial: BrandSettings }) {
  const [form, setForm] = useState({
    businessName: initial.businessName,
    taxId: initial.taxId ?? '',
    address: initial.address ?? '',
    email: initial.email ?? '',
    phone: initial.phone ?? '',
    website: initial.website ?? '',
    logoUrl: initial.logoUrl ?? '',
    accentColor: initial.accentColor,
    footerNote: initial.footerNote ?? '',
    defaultTaxRate: initial.defaultTaxRate,
    defaultCurrency: initial.defaultCurrency,
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onLogoFile(file: File) {
    if (file.size > MAX_LOGO_BYTES) {
      setError('El logo supera 2MB.');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      update('logoUrl', result);
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setToast(null);
    try {
      const payload: Record<string, unknown> = {
        businessName: form.businessName.trim(),
        taxId: form.taxId.trim() || null,
        address: form.address.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        website: form.website.trim() || null,
        logoUrl: form.logoUrl.trim() || null,
        accentColor: form.accentColor.trim(),
        footerNote: form.footerNote.trim() || null,
        defaultTaxRate: form.defaultTaxRate,
        defaultCurrency: form.defaultCurrency.trim().toUpperCase(),
      };
      const r = await fetch('/api/brand', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = (await r.json()) as { success: boolean; error: string | null };
      if (!r.ok || !j.success) {
        setError(j.error ?? 'save_failed');
        return;
      }
      setToast('Guardado.');
    } finally {
      setSaving(false);
    }
  }

  const row: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    flex: 1,
    minWidth: 0,
  };
  const label: React.CSSProperties = { fontSize: '0.7rem', color: '#555' };
  const input: React.CSSProperties = {
    padding: '0.4rem 0.5rem',
    border: '1px solid #000',
    background: '#fff',
    fontSize: '0.8rem',
    fontFamily: 'inherit',
  };

  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        border: '1px solid #000',
        background: '#fff',
        padding: '1rem',
      }}
    >
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div
          style={{
            width: '5rem',
            height: '5rem',
            border: '1px dashed #999',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fafafa',
            overflow: 'hidden',
            flex: 'none',
          }}
        >
          {form.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.logoUrl}
              alt="Logo"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          ) : (
            <span style={{ fontSize: '0.65rem', color: '#999' }}>logo</span>
          )}
        </div>
        <div style={{ ...row, justifyContent: 'center' }}>
          <label style={label}>Logo (PNG, JPG, SVG)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onLogoFile(f);
            }}
            style={{ fontSize: '0.75rem' }}
          />
          {form.logoUrl ? (
            <button
              type="button"
              onClick={() => update('logoUrl', '')}
              style={{
                alignSelf: 'flex-start',
                padding: '0.2rem 0.5rem',
                fontSize: '0.7rem',
                background: '#fff',
                border: '1px solid #000',
                cursor: 'pointer',
              }}
            >
              Quitar logo
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <label style={{ ...row, flex: 2 }}>
          <span style={label}>Nombre del negocio</span>
          <input
            required
            maxLength={200}
            value={form.businessName}
            onChange={(e) => update('businessName', e.target.value)}
            style={input}
          />
        </label>
        <label style={row}>
          <span style={label}>ID fiscal</span>
          <input
            maxLength={60}
            value={form.taxId}
            onChange={(e) => update('taxId', e.target.value)}
            style={input}
          />
        </label>
      </div>

      <label style={row}>
        <span style={label}>Dirección</span>
        <input
          maxLength={500}
          value={form.address}
          onChange={(e) => update('address', e.target.value)}
          style={input}
        />
      </label>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <label style={row}>
          <span style={label}>Email</span>
          <input
            type="email"
            maxLength={320}
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            style={input}
          />
        </label>
        <label style={row}>
          <span style={label}>Teléfono</span>
          <input
            maxLength={60}
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            style={input}
          />
        </label>
        <label style={row}>
          <span style={label}>Sitio web</span>
          <input
            maxLength={500}
            value={form.website}
            onChange={(e) => update('website', e.target.value)}
            style={input}
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <label style={{ ...row, flex: 'none', width: '10rem' }}>
          <span style={label}>Color de acento</span>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <input
              type="color"
              value={/^#/.test(form.accentColor) ? form.accentColor : '#111111'}
              onChange={(e) => update('accentColor', e.target.value)}
              style={{ width: '2rem', height: '2rem', border: '1px solid #000', padding: 0 }}
            />
            <input
              value={form.accentColor}
              onChange={(e) => update('accentColor', e.target.value)}
              maxLength={40}
              style={{ ...input, flex: 1 }}
            />
          </div>
        </label>
        <label style={{ ...row, flex: 'none', width: '8rem' }}>
          <span style={label}>Moneda por defecto</span>
          <input
            value={form.defaultCurrency}
            onChange={(e) => update('defaultCurrency', e.target.value)}
            maxLength={3}
            style={input}
          />
        </label>
        <label style={{ ...row, flex: 'none', width: '9rem' }}>
          <span style={label}>Tasa impuesto (0–1)</span>
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={form.defaultTaxRate}
            onChange={(e) => update('defaultTaxRate', parseFloat(e.target.value) || 0)}
            style={input}
          />
        </label>
      </div>

      <label style={row}>
        <span style={label}>Nota al pie</span>
        <textarea
          maxLength={500}
          rows={2}
          value={form.footerNote}
          onChange={(e) => update('footerNote', e.target.value)}
          style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }}
        />
      </label>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          paddingTop: '0.5rem',
          borderTop: '1px solid #eee',
        }}
      >
        <span style={{ fontSize: '0.7rem', color: error ? '#a00' : '#7a8b6f' }}>
          {error ?? toast ?? ''}
        </span>
        <button
          type="submit"
          disabled={saving}
          style={{
            background: '#000',
            color: '#fff',
            border: '1px solid #000',
            padding: '0.4rem 1rem',
            fontSize: '0.75rem',
            cursor: saving ? 'wait' : 'pointer',
          }}
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
