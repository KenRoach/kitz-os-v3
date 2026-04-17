'use client';

import { useState, type FormEvent } from 'react';
import type { Contact } from '@kitz/db';

export default function CreateContactForm({ onCreated }: { onCreated: (c: Contact) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          ...(email ? { email } : {}),
          ...(company ? { company } : {}),
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
      setName('');
      setEmail('');
      setCompany('');
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
        gridTemplateColumns: '1fr 1fr 1fr auto',
      }}
    >
      <input
        required
        minLength={1}
        maxLength={200}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre"
        className="kz-input"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="correo@empresa.com"
        className="kz-input"
      />
      <input
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        placeholder="Empresa"
        className="kz-input"
      />
      <button
        type="submit"
        disabled={saving}
        className="kz-button"
        style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.75rem' }}
      >
        {saving ? '…' : 'Agregar'}
      </button>
      {error && (
        <p className="kz-error" style={{ gridColumn: '1 / -1', margin: 0 }}>
          {error}
        </p>
      )}
    </form>
  );
}
