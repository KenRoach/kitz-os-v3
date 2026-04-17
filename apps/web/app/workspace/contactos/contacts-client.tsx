'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Contact } from '@kitz/db';
import ContactList from './contact-list';
import ContactDetail from './contact-detail';
import CreateContactForm from './create-contact-form';

export default function ContactsClient() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      const res = await fetch(`/api/contacts?${params.toString()}`);
      const body = (await res.json()) as {
        success: boolean;
        data: { items: Contact[] } | null;
        meta?: { total?: number };
        error: string | null;
      };
      if (!body.success || !body.data) {
        setError(body.error ?? 'unknown');
        setContacts([]);
        return;
      }
      setContacts(body.data.items);
      setTotal(body.meta?.total ?? body.data.items.length);
    } catch {
      setError('network_error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(query), 250);
    return () => clearTimeout(t);
  }, [query, load]);

  async function onCreated(c: Contact) {
    setShowCreate(false);
    setSelected(c);
    await load(query);
  }

  async function onPatched(c: Contact) {
    setSelected(c);
    await load(query);
  }

  async function onDeleted() {
    setSelected(null);
    await load(query);
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
          kitz crm
        </p>
        <h1 style={{ marginBottom: '0.25rem' }}>Contactos</h1>
        <p className="kz-mute">{total} total</p>
      </header>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Buscar nombre, correo, empresa o etiqueta…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="kz-input"
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="kz-button"
          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.75rem' }}
          onClick={() => setShowCreate((v) => !v)}
        >
          {showCreate ? 'Cancelar' : 'Nuevo contacto'}
        </button>
      </div>

      {showCreate && <CreateContactForm onCreated={onCreated} />}

      {error && <p className="kz-error">{error}</p>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(18rem, 24rem) 1fr',
          gap: '1.5rem',
        }}
      >
        <ContactList
          contacts={contacts}
          loading={loading}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
        />
        <ContactDetail contact={selected} onPatched={onPatched} onDeleted={onDeleted} />
      </div>
    </section>
  );
}
