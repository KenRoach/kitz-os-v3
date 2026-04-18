'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';

type Hit = {
  id: string;
  type: 'contact' | 'deal';
  title: string;
  subtitle: string | null;
  href: string;
};

const TYPE_LABELS: Record<Hit['type'], string> = {
  contact: 'Contactos',
  deal: 'Tratos',
};

export default function TopNavSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Cmd/Ctrl+K opens, Esc closes
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
    return;
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const body = (await res.json()) as { data: { results: Hit[] } | null };
        setHits(body.data?.results ?? []);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query, open]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setHits([]);
  }, []);

  function go(href: string) {
    close();
    router.push(href);
  }

  function onInputKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && hits[0]) {
      e.preventDefault();
      go(hits[0].href);
    }
  }

  const grouped = hits.reduce<Record<string, Hit[]>>((acc, h) => {
    (acc[h.type] ??= []).push(h);
    return acc;
  }, {});

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir búsqueda"
        style={{
          width: '100%',
          maxWidth: '34.8rem',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 0.75rem',
          border: '1px solid var(--kitz-border)',
          background: 'var(--kitz-muted)',
          color: 'var(--kitz-text-dim)',
          cursor: 'pointer',
          fontFamily: 'var(--kitz-font-mono)',
          fontSize: '0.75rem',
          textAlign: 'left',
        }}
      >
        <span aria-hidden>⌕</span>
        <span style={{ flex: 1 }}>Buscar contactos, tratos…</span>
        <span className="kz-kbd" style={{ fontSize: '0.65rem' }}>
          ⌘K
        </span>
      </button>

      {open && (
        <div
          onClick={close}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '6rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Búsqueda global"
            style={{
              width: '100%',
              maxWidth: '36rem',
              background: 'var(--kitz-bg)',
              border: '1px solid var(--kitz-border)',
              boxShadow: '0 4px 0 var(--kitz-border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--kitz-border)',
              }}
            >
              <span aria-hidden style={{ color: 'var(--kitz-text-dim)' }}>
                ⌕
              </span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Escribe al menos 2 caracteres…"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontFamily: 'var(--kitz-font-mono)',
                  fontSize: '0.875rem',
                  color: 'var(--kitz-text-strong)',
                }}
              />
              <span className="kz-kbd" style={{ fontSize: '0.65rem' }}>
                ESC
              </span>
            </div>

            <div style={{ maxHeight: '24rem', overflowY: 'auto' }}>
              {loading && (
                <p
                  className="kz-mute"
                  style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem' }}
                >
                  buscando…
                </p>
              )}

              {!loading && query.trim().length >= 2 && hits.length === 0 && (
                <p
                  className="kz-mute"
                  style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem' }}
                >
                  sin resultados para "{query}"
                </p>
              )}

              {!loading && query.trim().length < 2 && (
                <p
                  className="kz-mute"
                  style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem' }}
                >
                  busca contactos, tratos. Enter abre el primero.
                </p>
              )}

              {!loading &&
                Object.entries(grouped).map(([type, items]) => (
                  <div key={type}>
                    <p
                      className="kz-label"
                      style={{
                        margin: 0,
                        padding: '0.5rem 1rem 0.25rem',
                        background: 'var(--kitz-muted)',
                      }}
                    >
                      {TYPE_LABELS[type as Hit['type']]} ({items.length})
                    </p>
                    {items.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => go(h.href)}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.6rem 1rem',
                          border: 'none',
                          borderBottom: '1px solid var(--kitz-border)',
                          background: 'var(--kitz-bg)',
                          cursor: 'pointer',
                          fontFamily: 'var(--kitz-font-mono)',
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: '0.8125rem',
                            color: 'var(--kitz-text-strong)',
                          }}
                        >
                          {h.title}
                        </p>
                        {h.subtitle && (
                          <p
                            className="kz-mute"
                            style={{ margin: '0.125rem 0 0 0', fontSize: '0.7rem' }}
                          >
                            {h.subtitle}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
