'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import ShellChatAttachments, { type Attachment } from './shell-chat-attachments';
import { useFullscreen } from './fullscreen-context';

type Message = {
  id: string;
  role: 'user' | 'kitz';
  text: string;
  ts: number;
  attachments?: Attachment[];
};

type Mode = 'desktop-open' | 'desktop-closed' | 'mobile-open' | 'mobile-closed';

const SEED_KITZ: Message = {
  id: 'seed',
  role: 'kitz',
  text: 'Kitz, tu asistente personal. ¿En qué te ayudo?',
  ts: Date.now(),
};

const SUGGESTIONS = [
  '¿Qué tengo hoy?',
  'Mostrar contactos recientes',
  'Crear una tarea',
  'Resumen semanal',
];

const MAX_INPUT = 2000;

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

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function ReferralFooter() {
  const [copied, setCopied] = useState(false);
  const link =
    typeof window !== 'undefined'
      ? `${window.location.origin}/login?ref=kitz`
      : 'https://kitz.services/login?ref=kitz';

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — silent */
    }
  }

  return (
    <div
      style={{
        flexShrink: 0,
        borderTop: '1px solid var(--kitz-border)',
        background: 'var(--kitz-bg)',
        padding: '0.55rem 0.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.5rem',
        fontSize: '0.65rem',
      }}
    >
      <span className="kz-mute" style={{ display: 'inline-flex', gap: '0.4rem' }}>
        <span aria-hidden>↗</span>
        <span>Invita a alguien a KitZ</span>
      </span>
      <button
        type="button"
        onClick={() => void copy()}
        className="kz-button kz-button-ghost"
        style={{
          width: 'auto',
          padding: '0.25rem 0.55rem',
          fontSize: '0.6rem',
          letterSpacing: '0.04em',
        }}
      >
        {copied ? 'Copiado ✓' : 'Copiar enlace'}
      </button>
    </div>
  );
}

type ShellChatProps = {
  /** Which side of the shell the chat lives on. Affects edge-tab + border. */
  side?: 'left' | 'right';
};

export default function ShellChat({ side = 'right' }: ShellChatProps = {}) {
  const [messages, setMessages] = useState<Message[]>([SEED_KITZ]);
  const [input, setInput] = useState('');
  const [userOpen, setUserOpen] = useState(true);
  const [sending, setSending] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const isMobile = useIsMobile();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { fullscreen, setFullscreen } = useFullscreen();

  // Fullscreen forces the panel closed; clicking the side edge tab
  // re-opens chat AND exits fullscreen so the user can always recover.
  const open = userOpen && !fullscreen;
  const setOpen = setUserOpen;

  function reopenFromEdge() {
    if (fullscreen) setFullscreen(false);
    setUserOpen(true);
  }

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
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if ((!trimmed && pendingAttachments.length === 0) || sending) return;
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      ts: Date.now(),
      ...(pendingAttachments.length > 0 ? { attachments: pendingAttachments } : {}),
    };
    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setPendingAttachments([]);
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
      setMessages((prev) => [
        ...prev,
        { id: `k-${Date.now()}`, role: 'kitz', text: reply, ts: Date.now() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `k-${Date.now()}`,
          role: 'kitz',
          text: 'Error de red. Intenta de nuevo.',
          ts: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
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
        onClick={reopenFromEdge}
        className="kz-button kz-button-ghost"
        style={{
          position: 'fixed',
          ...(side === 'left' ? { left: 0 } : { right: 0 }),
          top: '50%',
          transform: 'translateY(-50%)',
          width: '2rem',
          height: '6rem',
          writingMode: 'vertical-rl',
          fontSize: '0.7rem',
          padding: 0,
          ...(side === 'left' ? { borderLeft: 'none' } : { borderRight: 'none' }),
          zIndex: 20,
        }}
        aria-label={fullscreen ? 'Salir de pantalla completa y abrir chat' : 'Abrir chat de KitZ'}
        title={fullscreen ? 'Salir (⌘.) / abrir chat' : 'Abrir chat (⌘/)'}
      >
        CHAT ⌘/
      </button>
    );
  }

  const userHasSpoken = messages.some((m) => m.role === 'user');
  const charCount = input.length;
  const overLimit = charCount > MAX_INPUT;

  const panel = (
    <div
      style={{
        width: mode === 'mobile-open' ? '100%' : 'clamp(20rem, 24vw, 26rem)',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        ...(side === 'left'
          ? { borderRight: '1px solid var(--kitz-border)' }
          : { borderLeft: '1px solid var(--kitz-border)' }),
        background: 'var(--kitz-bg)',
        flexShrink: 0,
      }}
    >
      <header
        style={{
          height: '2.75rem',
          padding: '0 1rem',
          borderBottom: '1px solid var(--kitz-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', minWidth: 0 }}>
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: '0.5rem',
              height: '0.5rem',
              background: 'var(--kitz-text-strong)',
              flexShrink: 0,
            }}
          />
          <p
            style={{
              margin: 0,
              color: 'var(--kitz-text-strong)',
              fontWeight: 600,
              fontSize: '0.8125rem',
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            KitZ AI Chat
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span className="kz-kbd" title="Atajo: Cmd/Ctrl + /" style={{ fontSize: '0.6rem' }}>
            ⌘/
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar chat"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--kitz-text-dim)',
              fontSize: '1.1rem',
              lineHeight: 1,
              padding: '0 0.25rem',
            }}
          >
            ×
          </button>
        </div>
      </header>

      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.25rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          minHeight: 0,
        }}
      >
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
              }}
            >
              <p
                className="kz-label"
                style={{
                  margin: '0 0 0.25rem 0',
                  fontSize: '0.6rem',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'baseline',
                }}
              >
                <span>{isUser ? 'TÚ' : 'KITZ'}</span>
                <span style={{ color: 'var(--kitz-text-dim)', textTransform: 'none' }}>
                  {formatTime(m.ts)}
                </span>
              </p>
              <div
                style={{
                  maxWidth: '92%',
                  padding: '0.5rem 0.75rem',
                  border: isUser
                    ? '1px solid var(--kitz-text-strong)'
                    : '1px solid var(--kitz-border)',
                  background: isUser ? 'var(--kitz-text-strong)' : 'var(--kitz-bg)',
                  color: isUser ? 'var(--kitz-bg)' : 'var(--kitz-text-strong)',
                  fontSize: '0.8125rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                }}
              >
                {m.attachments && m.attachments.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {m.attachments.map((a) => (
                      <span
                        key={a.id}
                        title={`${a.name} · ${a.mimeType}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.15rem 0.4rem',
                          border: isUser
                            ? '1px solid var(--kitz-bg)'
                            : '1px solid var(--kitz-border)',
                          fontSize: '0.65rem',
                          fontFamily: 'var(--kitz-font-mono)',
                          color: isUser ? 'var(--kitz-bg)' : 'var(--kitz-text)',
                        }}
                      >
                        <span aria-hidden style={{ display: 'inline-flex' }}>
                          {a.kind === 'image' ? (
                            <svg
                              width={11}
                              height={11}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.75}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect x="3" y="3" width="18" height="18" rx="1" />
                              <circle cx="9" cy="9" r="1.5" />
                              <path d="M21 16l-5-5-9 9" />
                            </svg>
                          ) : a.kind === 'audio' ? (
                            <svg
                              width={11}
                              height={11}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.75}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
                            </svg>
                          ) : (
                            <svg
                              width={11}
                              height={11}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.75}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8z" />
                              <path d="M14 3v5h5" />
                            </svg>
                          )}
                        </span>
                        <span
                          style={{
                            maxWidth: '8rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {a.name}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
                {m.text && <span>{m.text}</span>}
              </div>
            </div>
          );
        })}

        {sending && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <p className="kz-label" style={{ margin: '0 0 0.25rem 0', fontSize: '0.6rem' }}>
              KITZ
            </p>
            <div
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--kitz-border)',
                color: 'var(--kitz-text-dim)',
                fontSize: '0.8125rem',
              }}
              aria-live="polite"
            >
              <span className="kz-caret">pensando</span>
            </div>
          </div>
        )}
      </div>

      {!userHasSpoken && (
        <div
          style={{
            padding: '0.5rem 1rem 0.25rem',
            borderTop: '1px solid var(--kitz-border)',
            flexShrink: 0,
          }}
        >
          <p className="kz-label" style={{ margin: '0 0 0.4rem 0', fontSize: '0.6rem' }}>
            Sugerencias
          </p>
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void send(s)}
                disabled={sending}
                style={{
                  cursor: sending ? 'wait' : 'pointer',
                  border: '1px solid var(--kitz-border)',
                  background: 'var(--kitz-bg)',
                  color: 'var(--kitz-text)',
                  opacity: sending ? 0.5 : 1,
                  fontFamily: 'var(--kitz-font-mono)',
                  fontSize: '0.68rem',
                  padding: '0.25rem 0.45rem',
                  whiteSpace: 'nowrap',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={onSubmit}
        style={{
          padding: '0.6rem 0.75rem 0.75rem',
          borderTop: '1px solid var(--kitz-border)',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          background: 'var(--kitz-bg)',
        }}
      >
        <ShellChatAttachments
          attachments={pendingAttachments}
          onAdd={(a) => setPendingAttachments((prev) => [...prev, a])}
          onRemove={(id) => setPendingAttachments((prev) => prev.filter((x) => x.id !== id))}
          disabled={sending}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '0.4rem',
            border: '1px solid var(--kitz-border)',
            padding: '0.35rem 0.4rem 0.35rem 0.6rem',
            background: 'var(--kitz-bg)',
          }}
        >
          <span
            aria-hidden
            className="kz-mute"
            style={{ fontSize: '0.85rem', lineHeight: '1.5rem', flexShrink: 0 }}
          >
            ›
          </span>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={sending ? 'KitZ está pensando…' : 'Escribe a KitZ…'}
            disabled={sending}
            rows={1}
            maxLength={MAX_INPUT + 100}
            style={{
              flex: 1,
              minHeight: '1.5rem',
              maxHeight: '8rem',
              resize: 'none',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--kitz-text-strong)',
              fontFamily: 'var(--kitz-font-mono)',
              fontSize: '0.8125rem',
              lineHeight: 1.5,
              padding: 0,
            }}
          />
          <button
            type="submit"
            className="kz-button"
            disabled={(!input.trim() && pendingAttachments.length === 0) || sending || overLimit}
            style={{
              width: 'auto',
              padding: '0.4rem 0.7rem',
              fontSize: '0.7rem',
              flexShrink: 0,
            }}
          >
            {sending ? '…' : 'Enviar ⏎'}
          </button>
        </div>
        {charCount > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              fontSize: '0.62rem',
              color: overLimit ? 'var(--kitz-error)' : 'var(--kitz-text-dim)',
            }}
          >
            {charCount} / {MAX_INPUT}
          </div>
        )}
      </form>

      <ReferralFooter />
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
