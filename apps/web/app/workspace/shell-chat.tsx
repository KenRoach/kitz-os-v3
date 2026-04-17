'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

type Message = {
  id: string;
  role: 'user' | 'kitz';
  text: string;
};

type Mode = 'desktop-open' | 'desktop-closed' | 'mobile-open' | 'mobile-closed';

const SEED_KITZ: Message = {
  id: 'seed',
  role: 'kitz',
  text: 'Kitz, tu asistente personal. ¿En qué te ayudo?',
};

const SUGGESTIONS = [
  '¿Qué tengo hoy?',
  'Mostrar contactos recientes',
  'Crear una tarea',
  'Resumen semanal',
];

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    const sync = () => setIsMobile(mql.matches);
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, []);
  return isMobile;
}

export default function ShellChat() {
  const [messages, setMessages] = useState<Message[]>([SEED_KITZ]);
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(true);
  const isMobile = useIsMobile();
  const listRef = useRef<HTMLDivElement>(null);

  // Cmd/Ctrl + / to toggle
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  const [sending, setSending] = useState(false);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text: trimmed };
    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history }),
      });
      const body = (await res.json()) as {
        success: boolean;
        data: { reply: string } | null;
        error: string | null;
      };
      const reply =
        body.success && body.data?.reply ? body.data.reply : `Error: ${body.error ?? 'unknown'}`;
      setMessages((prev) => [...prev, { id: `k-${Date.now()}`, role: 'kitz', text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `k-${Date.now()}`, role: 'kitz', text: 'Error de red. Intenta de nuevo.' },
      ]);
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  const mode: Mode = isMobile
    ? open
      ? 'mobile-open'
      : 'mobile-closed'
    : open
      ? 'desktop-open'
      : 'desktop-closed';

  if (mode === 'desktop-closed') {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="kz-button kz-button-ghost"
        style={{
          position: 'fixed',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: '2rem',
          height: '6rem',
          writingMode: 'vertical-rl',
          fontSize: '0.7rem',
          padding: 0,
          borderRight: 'none',
        }}
        aria-label="Abrir chat de Kitz"
        title="Abrir chat (⌘/)"
      >
        CHAT ⌘/
      </button>
    );
  }

  const panel = (
    <div
      style={{
        width: mode === 'mobile-open' ? '100%' : 'clamp(20rem, 26vw, 28rem)',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid var(--kitz-border)',
        background: 'var(--kitz-bg)',
        flexShrink: 0,
      }}
    >
      <header
        style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--kitz-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <p className="kz-mute kz-prompt" style={{ margin: 0 }}>
          kitz chat
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cerrar chat"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--kitz-text-dim)',
            fontSize: '1rem',
          }}
        >
          ×
        </button>
      </header>

      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        {messages.map((m) => (
          <div key={m.id}>
            <p className="kz-label" style={{ margin: '0 0 0.25rem 0', fontSize: '0.65rem' }}>
              {m.role === 'user' ? 'TÚ' : 'KITZ'}
            </p>
            <p
              style={{
                margin: 0,
                color: m.role === 'user' ? 'var(--kitz-text-strong)' : 'var(--kitz-text)',
              }}
            >
              {m.text}
            </p>
          </div>
        ))}
      </div>

      <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid var(--kitz-border)' }}>
        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void send(s)}
              className="kz-kbd"
              disabled={sending}
              style={{
                cursor: sending ? 'wait' : 'pointer',
                border: '1px solid var(--kitz-border)',
                background: 'var(--kitz-bg)',
                opacity: sending ? 0.5 : 1,
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <form onSubmit={onSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={sending ? 'Kitz está pensando…' : 'Escribe a Kitz…'}
            className="kz-input"
            style={{ flex: 1 }}
            disabled={sending}
          />
          <button
            type="submit"
            className="kz-button"
            style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.75rem' }}
            disabled={!input.trim() || sending}
          >
            {sending ? '…' : 'Enviar'}
          </button>
        </form>
      </div>
    </div>
  );

  if (mode === 'mobile-open') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          background: 'var(--kitz-bg)',
        }}
      >
        {panel}
      </div>
    );
  }

  if (mode === 'mobile-closed') {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="kz-button"
        style={{
          position: 'fixed',
          right: '1rem',
          bottom: '1rem',
          width: 'auto',
          padding: '0.75rem 1rem',
          fontSize: '0.75rem',
          zIndex: 40,
        }}
        aria-label="Abrir chat"
      >
        CHAT
      </button>
    );
  }

  return panel;
}
