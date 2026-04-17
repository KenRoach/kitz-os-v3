'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { Contact } from '@kitz/db';

type Props = {
  contact: Contact | null;
  onPatched: (c: Contact) => void;
  onDeleted: () => void;
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  company: string;
  tags: string;
  notes: string;
};

function toForm(c: Contact): FormState {
  return {
    name: c.name,
    email: c.email ?? '',
    phone: c.phone ?? '',
    company: c.company ?? '',
    tags: c.tags.join(', '),
    notes: c.notes ?? '',
  };
}

export default function ContactDetail({ contact, onPatched, onDeleted }: Props) {
  const [form, setForm] = useState<FormState | null>(contact ? toForm(contact) : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(contact ? toForm(contact) : null);
    setError(null);
  }, [contact]);

  if (!contact || !form) {
    return (
      <div className="kz-panel" style={{ padding: '1rem' }}>
        <p className="kz-mute kz-prompt">kitz contact</p>
        <p className="kz-mute" style={{ marginTop: '0.5rem' }}>
          Selecciona un contacto para ver y editar.
        </p>
      </div>
    );
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form || !contact) return;
    setSaving(true);
    setError(null);
    try {
      const tags = form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email || null,
          phone: form.phone || null,
          company: form.company || null,
          tags,
          notes: form.notes || null,
        }),
      });
      const body = (await res.json()) as {
        success: boolean;
        data: Contact | null;
        error: string | null;
      };
      if (!body.success || !body.data) {
        setError(body.error ?? 'unknown');
        return;
      }
      onPatched(body.data);
    } catch {
      setError('network_error');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!contact) return;
    if (!confirm(`Eliminar a ${contact.name}?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, { method: 'DELETE' });
      if (res.ok) onDeleted();
      else setError('delete_failed');
    } finally {
      setSaving(false);
    }
  }

  const onField =
    (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  return (
    <form
      onSubmit={save}
      className="kz-panel"
      style={{ padding: '1.25rem', display: 'grid', gap: '0.75rem' }}
    >
      <p className="kz-mute kz-prompt" style={{ margin: 0 }}>
        kitz contact
      </p>
      <label className="kz-label">Nombre</label>
      <input required className="kz-input" value={form.name} onChange={onField('name')} />
      <label className="kz-label">Correo</label>
      <input type="email" className="kz-input" value={form.email} onChange={onField('email')} />
      <label className="kz-label">Teléfono</label>
      <input className="kz-input" value={form.phone} onChange={onField('phone')} />
      <label className="kz-label">Empresa</label>
      <input className="kz-input" value={form.company} onChange={onField('company')} />
      <label className="kz-label">Etiquetas (separadas por coma)</label>
      <input className="kz-input" value={form.tags} onChange={onField('tags')} />
      <label className="kz-label">Notas</label>
      <textarea
        className="kz-input"
        value={form.notes}
        onChange={onField('notes')}
        rows={4}
        style={{ fontFamily: 'var(--kitz-font-mono)', resize: 'vertical' }}
      />
      {error && <p className="kz-error">{error}</p>}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button
          type="submit"
          disabled={saving}
          className="kz-button"
          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.75rem' }}
        >
          {saving ? '…' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={saving}
          className="kz-button kz-button-ghost"
          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.75rem' }}
        >
          Eliminar
        </button>
      </div>
    </form>
  );
}
