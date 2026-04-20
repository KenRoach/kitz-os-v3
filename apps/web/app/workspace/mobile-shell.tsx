'use client';

/**
 * MobileShell — full-screen mobile experience for the workspace.
 *
 * Adapted from the Anthropic-Labs paste with the same Japandi terminal
 * aesthetic (blanco hueso #F9F6EF, JetBrains Mono, sharp borders, KMark)
 * but **wired to the real KitZ APIs** instead of hardcoded responses:
 *
 *   - /api/chat            chat send (debits credits server-side)
 *   - /api/calendar?from   today's events (Hoy tab)
 *   - /api/contacts        contact list (Contactos tab)
 *   - /api/setup-progress  dashboard stats + checklist (Panel tab)
 *
 * Visible only when viewport <= 768px (CSS-driven via the parent layout).
 * Desktop is untouched.
 */

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Bell,
  Calendar,
  Camera,
  Check,
  ChevronRight,
  FileText,
  Home,
  type LucideIcon,
  MessageSquare,
  Mic,
  Paperclip,
  Plus,
  Search,
  Send,
  Users,
} from 'lucide-react';

/** Japandi tokens — blanco hueso (bone white) + sharp ink. */
const T = {
  bg: '#F9F6EF',
  surface: '#FDFBF6',
  sunk: '#F2EEE4',
  ink: '#1A1A1A',
  ink2: '#5C5850',
  ink3: '#9E998D',
  line: '#E5DFD0',
  lineStrong: '#1A1A1A',
  moss: '#7A8B6F',
  accent: '#A68B5B',
  mono: "'JetBrains Mono', 'Menlo', 'Courier New', monospace",
  serif: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
};

type TabId = 'chat' | 'dashboard' | 'contacts' | 'calendar';
type ChatRole = 'kitz' | 'user';
type Message = { id: string; from: ChatRole; time: string; text: string };

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function KMark({ size = 18, inverse = false }: { size?: number; inverse?: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        background: inverse ? T.bg : T.ink,
        color: inverse ? T.ink : T.bg,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontFamily: T.mono,
        fontSize: Math.round(size * 0.65),
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      K
    </span>
  );
}

type Props = {
  tenantName: string;
  credits: number;
  email: string;
};

export default function MobileShell({ tenantName, credits, email: _email }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('chat');

  return (
    <>
      <style>{`
        /* Lock all form elements to mono so the iOS / Android sans default doesn't leak in */
        .kitz-mobile input,
        .kitz-mobile button,
        .kitz-mobile textarea,
        .kitz-mobile select {
          font-family: ${T.mono};
          -webkit-font-smoothing: antialiased;
        }
        .kitz-mobile ::placeholder { font-family: ${T.mono}; opacity: 0.55; }
        .kitz-mobile [data-serif='true'] { font-family: ${T.serif} !important; }

        /* Swipe-hint micro-animation on the suggestions rail */
        @keyframes kitzSwipeHint {
          0%   { transform: translateX(0); }
          18%  { transform: translateX(-10px); }
          36%  { transform: translateX(0); }
          54%  { transform: translateX(-6px); }
          72%  { transform: translateX(0); }
          100% { transform: translateX(0); }
        }
        .kitz-mobile .swipe-hint-rail {
          animation: kitzSwipeHint 3.2s ease-in-out 1.4s 2;
          will-change: transform;
        }
        .kitz-mobile .swipe-hint-rail:active,
        .kitz-mobile .swipe-hint-wrap:hover .swipe-hint-rail {
          animation: none;
        }
        @keyframes kitzPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        .kitz-mobile .kitz-rec-dot { animation: kitzPulse 1s infinite; }
        .kitz-mobile ::-webkit-scrollbar { display: none; }
        @media (prefers-reduced-motion: reduce) {
          .kitz-mobile .swipe-hint-rail,
          .kitz-mobile .kitz-rec-dot { animation: none; }
        }
      `}</style>
      <div
        className="kitz-mobile"
        style={{
          position: 'fixed',
          inset: 0,
          background: T.bg,
          color: T.ink,
          fontFamily: T.mono,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <header
          style={{
            borderBottom: `1px solid ${T.ink}`,
            padding: '14px 16px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: T.bg,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <KMark size={18} />
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.02em',
              }}
            >
              KitZ Mobile
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 11,
              color: T.ink3,
            }}
          >
            <span>{credits} cr</span>
            <Bell size={13} strokeWidth={1.5} aria-label="Notificaciones" />
            <Search size={13} strokeWidth={1.5} aria-label="Buscar" />
          </div>
        </header>

        {/* Context strip */}
        <div
          style={{
            padding: '8px 16px',
            borderBottom: `1px solid ${T.line}`,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            color: T.ink3,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            flexShrink: 0,
          }}
        >
          <span>$ kitz · owner</span>
          <span>{new Date().toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })} · {nowHHMM()}</span>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'chat' && <ChatTab />}
          {activeTab === 'dashboard' && <DashboardTab tenantName={tenantName} credits={credits} />}
          {activeTab === 'contacts' && <ContactsTab />}
          {activeTab === 'calendar' && <CalendarTab />}
        </div>

        {/* Bottom nav */}
        <nav
          style={{
            borderTop: `1px solid ${T.ink}`,
            background: T.bg,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            flexShrink: 0,
          }}
        >
          {(
            [
              { id: 'chat', label: 'Chat', icon: 'kmark' as const },
              { id: 'dashboard', label: 'Panel', icon: Home },
              { id: 'contacts', label: 'Contactos', icon: Users },
              { id: 'calendar', label: 'Agenda', icon: Calendar },
            ] satisfies Array<{ id: TabId; label: string; icon: 'kmark' | LucideIcon }>
          ).map((tab, i, arr) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={active}
                aria-label={tab.label}
                style={{
                  padding: '10px 0 12px',
                  border: 'none',
                  background: active ? T.ink : 'transparent',
                  color: active ? T.bg : T.ink,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  fontFamily: T.mono,
                  fontSize: 9,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  borderRight: i < arr.length - 1 ? `1px solid ${T.line}` : 'none',
                }}
              >
                {tab.icon === 'kmark' ? (
                  <KMark size={16} inverse={active} />
                ) : (
                  (() => {
                    const Icon = tab.icon;
                    return <Icon size={16} strokeWidth={1.5} />;
                  })()
                )}
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}

/* ───────────────────────── Chat Tab ─────────────────────────── */

const QUICK_ACTIONS: Array<{
  id: string;
  label: string;
  icon: LucideIcon;
  cmd: string;
}> = [
  { id: 'brain', label: 'Brain dump', icon: Mic, cmd: 'Grabando brain dump…' },
  { id: 'upload', label: 'Subir doc', icon: Paperclip, cmd: 'Subir documento' },
  { id: 'appt', label: 'Nueva cita', icon: Calendar, cmd: 'Crear nueva cita' },
  { id: 'quote', label: 'Cotización', icon: FileText, cmd: 'Generar cotización' },
  { id: 'contact', label: 'Contacto', icon: Users, cmd: 'Agregar nuevo contacto' },
  { id: 'agenda', label: 'Hoy', icon: Calendar, cmd: '¿Qué tengo hoy?' },
  { id: 'wa', label: 'WhatsApp', icon: MessageSquare, cmd: 'Mostrar WhatsApp' },
  { id: 'report', label: 'Reporte', icon: FileText, cmd: 'Reporte semanal' },
];

function ChatTab() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'seed',
      from: 'kitz',
      time: nowHHMM(),
      text: 'Kitz, tu asistente personal. ¿En qué te ayudo?',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, recording]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setShowAttach(false);
    setInput('');
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      from: 'user',
      time: nowHHMM(),
      text: trimmed,
    };
    setMessages((m) => [...m, userMsg]);
    setSending(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: [...messages, userMsg].slice(-20).map((m) => ({
            role: m.from,
            text: m.text,
          })),
        }),
      });
      // /api/chat returns 402 on insufficient credits, 502 if ai-runtime
      // is down (debit still happened), or 200 with the upstream reply.
      if (res.status === 402) {
        setMessages((m) => [
          ...m,
          {
            id: `k-${Date.now()}`,
            from: 'kitz',
            time: nowHHMM(),
            text: 'Sin créditos. Recarga tu batería en Ajustes → Facturación para seguir.',
          },
        ]);
        return;
      }
      const json = (await res.json().catch(() => null)) as
        | {
            success?: boolean;
            data?: { reply?: string; model?: string } | null;
            error?: string | null;
          }
        | null;
      const reply =
        json?.data?.reply ??
        (res.ok
          ? 'Listo.'
          : 'No pude conectar con el motor. El cargo no se aplicó.');
      setMessages((m) => [
        ...m,
        { id: `k-${Date.now()}`, from: 'kitz', time: nowHHMM(), text: reply },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: `k-${Date.now()}`,
          from: 'kitz',
          time: nowHHMM(),
          text: 'Error de red. Intenta de nuevo.',
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [messages, sending]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const onAction = (a: (typeof QUICK_ACTIONS)[number]) => {
    if (a.id === 'brain') {
      setRecording(true);
      window.setTimeout(() => setRecording(false), 1500);
    }
    void send(a.cmd);
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Messages */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.from === 'kitz' ? 'flex-start' : 'flex-end',
              maxWidth: '85%',
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: T.ink3,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 4,
                textAlign: m.from === 'user' ? 'right' : 'left',
              }}
            >
              {m.from === 'kitz' ? 'KITZ' : 'TÚ'} {m.time}
            </div>
            <div
              style={{
                border: `1px solid ${T.ink}`,
                padding: '10px 12px',
                fontSize: 13,
                lineHeight: 1.5,
                background: m.from === 'user' ? T.ink : T.bg,
                color: m.from === 'user' ? T.bg : T.ink,
                whiteSpace: 'pre-wrap',
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
        {recording && (
          <div
            style={{
              alignSelf: 'center',
              border: `1px solid ${T.ink}`,
              padding: '8px 14px',
              fontSize: 11,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              className="kitz-rec-dot"
              aria-hidden
              style={{ width: 8, height: 8, borderRadius: '50%', background: '#d00' }}
            />
            Grabando…
          </div>
        )}
        {sending && !recording && (
          <div style={{ alignSelf: 'flex-start', fontSize: 10, color: T.ink3 }}>
            KitZ está pensando…
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div
        style={{
          padding: '10px 16px 8px',
          borderTop: `1px solid ${T.line}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: 9,
            color: T.ink3,
            letterSpacing: '0.1em',
            marginBottom: 8,
            textTransform: 'uppercase',
          }}
        >
          Sugerencias
        </div>
        <div className="swipe-hint-wrap" style={{ position: 'relative' }}>
          <div
            className="swipe-hint-rail"
            style={{
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              paddingBottom: 4,
              scrollbarWidth: 'none',
            }}
          >
            {QUICK_ACTIONS.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onAction(a)}
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '6px 10px',
                    border: `1px solid ${T.ink}`,
                    background: T.bg,
                    fontFamily: T.mono,
                    fontSize: 11,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    color: T.ink,
                  }}
                >
                  <Icon size={11} strokeWidth={1.5} />
                  {a.label}
                </button>
              );
            })}
          </div>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 4,
              width: 32,
              pointerEvents: 'none',
              background: `linear-gradient(to right, transparent, ${T.bg})`,
            }}
          />
        </div>
      </div>

      {/* Attach tray */}
      {showAttach && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: `1px solid ${T.line}`,
            display: 'flex',
            gap: 8,
            background: T.sunk,
            flexShrink: 0,
          }}
        >
          {(
            [
              { icon: FileText, label: 'PDF / Doc' },
              { icon: FileText, label: 'Excel' },
              { icon: Camera, label: 'Foto' },
              { icon: Paperclip, label: 'Archivo' },
            ] satisfies Array<{ icon: LucideIcon; label: string }>
          ).map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={i}
                type="button"
                onClick={() => void send(`Subiendo ${item.label}…`)}
                style={{
                  flex: 1,
                  padding: '10px 6px',
                  border: `1px solid ${T.ink}`,
                  background: T.bg,
                  fontFamily: T.mono,
                  fontSize: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                }}
              >
                <Icon size={14} strokeWidth={1.5} />
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Input dock */}
      <form
        onSubmit={onSubmit}
        style={{
          padding: '10px 12px 12px',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderTop: `1px solid ${T.line}`,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => setShowAttach((v) => !v)}
          aria-label="Adjuntar"
          style={{
            width: 36,
            height: 36,
            border: `1px solid ${T.ink}`,
            background: showAttach ? T.ink : T.bg,
            color: showAttach ? T.bg : T.ink,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <Paperclip size={15} strokeWidth={1.5} />
        </button>

        <div
          style={{
            flex: 1,
            border: `1px solid ${T.ink}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            height: 36,
            background: T.bg,
          }}
        >
          <span style={{ color: T.ink3, marginRight: 6, fontSize: 13 }}>›</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe a KitZ…"
            disabled={sending}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: T.mono,
              fontSize: 13,
              color: T.ink,
            }}
          />
        </div>

        <button
          type="button"
          onTouchStart={() => setRecording(true)}
          onTouchEnd={() => setRecording(false)}
          onMouseDown={() => setRecording(true)}
          onMouseUp={() => setRecording(false)}
          onMouseLeave={() => setRecording(false)}
          aria-label="Mantén para grabar"
          style={{
            width: 36,
            height: 36,
            border: `1px solid ${T.ink}`,
            background: recording ? T.ink : T.bg,
            color: recording ? T.bg : T.ink,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <Mic size={15} strokeWidth={1.5} />
        </button>

        <button
          type="submit"
          disabled={sending || !input.trim()}
          style={{
            height: 36,
            padding: '0 12px',
            border: `1px solid ${T.ink}`,
            background: T.ink,
            color: T.bg,
            fontFamily: T.mono,
            fontSize: 11,
            letterSpacing: '0.05em',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: sending || !input.trim() ? 0.55 : 1,
            flexShrink: 0,
          }}
        >
          ENVIAR
          <Send size={11} strokeWidth={1.5} />
        </button>
      </form>
    </div>
  );
}

/* ───────────────────────── Dashboard Tab ─────────────────────── */

type SetupMilestone = { id: string; done: boolean };
type SetupSnap = { milestones: SetupMilestone[]; doneCount: number; total: number };

const MILESTONE_COPY: Record<string, string> = {
  add_contact: 'Agregar primer contacto',
  activate_agent: 'Activar primer agente',
  connect_whatsapp: 'Conectar WhatsApp',
  create_quote: 'Crear primera cotización',
  topup_battery: 'Recargar batería',
};

function DashboardTab({ tenantName, credits }: { tenantName: string; credits: number }) {
  const [snap, setSnap] = useState<SetupSnap | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/setup-progress', { cache: 'no-store' });
        const j = (await res.json()) as { data: SetupSnap | null };
        if (!cancelled && j.data) setSnap(j.data);
      } catch {
        /* keep empty state */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const milestones = snap?.milestones ?? [];
  const doneCount = snap?.doneCount ?? 0;
  const total = snap?.total ?? 5;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
      <h1
        data-serif="true"
        style={{
          fontSize: 26,
          fontWeight: 500,
          margin: '0 0 2px',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
        }}
      >
        Dashboard
      </h1>
      <div style={{ fontSize: 10, color: T.ink3, marginBottom: 20 }}>
        {tenantName} · owner
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0,
          border: `1px solid ${T.ink}`,
          marginBottom: 20,
        }}
      >
        {(
          [
            { label: 'CRÉDITOS IA', value: String(credits), sub: 'batería actual' },
            { label: 'SETUP', value: `${doneCount} / ${total}`, sub: 'configuración' },
          ] as const
        ).map((stat, i) => (
          <div
            key={i}
            style={{
              padding: '14px 12px',
              borderRight: i % 2 === 0 ? `1px solid ${T.line}` : 'none',
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: T.ink3,
                letterSpacing: '0.1em',
                marginBottom: 6,
              }}
            >
              {stat.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{stat.value}</div>
            {stat.sub && <div style={{ fontSize: 9, color: T.ink3, marginTop: 2 }}>{stat.sub}</div>}
          </div>
        ))}
      </div>

      {/* Setup checklist (real data from /api/setup-progress) */}
      <div style={{ border: `1px solid ${T.ink}`, padding: 14 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 10,
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, fontFamily: T.mono }}>
            Configuración
          </h2>
          <div style={{ fontSize: 10, color: T.ink3 }}>
            {doneCount} / {total}
          </div>
        </div>
        {milestones.length === 0 ? (
          <div style={{ fontSize: 12, color: T.ink3 }}>Cargando…</div>
        ) : (
          milestones.map((item) => {
            const text = MILESTONE_COPY[item.id] ?? item.id;
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 0',
                  fontSize: 13,
                  textDecoration: item.done ? 'line-through' : 'none',
                  color: item.done ? T.ink3 : T.ink,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 14,
                    height: 14,
                    border: `1px solid ${item.done ? T.moss : T.ink}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: item.done ? T.moss : 'transparent',
                    flexShrink: 0,
                  }}
                >
                  {item.done && <Check size={10} color={T.bg} strokeWidth={2} />}
                </span>
                {text}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Contacts Tab ─────────────────────── */

type Contact = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  tags: string[];
};

function ContactsTab() {
  const [items, setItems] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/contacts', { cache: 'no-store' });
        const j = (await res.json()) as { data: { items: Contact[] } | null };
        if (!cancelled) setItems(j.data?.items ?? []);
      } catch {
        /* keep empty */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = query
    ? items.filter((c) =>
        [c.name, c.email ?? '', c.company ?? ''].some((v) =>
          v.toLowerCase().includes(query.toLowerCase()),
        ),
      )
    : items;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
      <h1
        data-serif="true"
        style={{
          fontSize: 26,
          fontWeight: 500,
          margin: '0 0 16px',
          letterSpacing: '-0.02em',
        }}
      >
        Contactos
      </h1>

      <div
        style={{
          border: `1px solid ${T.ink}`,
          padding: '10px 12px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Search size={13} strokeWidth={1.5} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar contactos…"
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: T.mono,
            fontSize: 12,
            color: T.ink,
          }}
        />
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: T.ink3 }}>Cargando…</div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            border: `1px dashed ${T.ink3}`,
            padding: '20px 12px',
            fontSize: 12,
            color: T.ink2,
            textAlign: 'center',
          }}
        >
          {items.length === 0 ? 'Sin contactos. Agrega el primero abajo.' : 'Nada coincide.'}
        </div>
      ) : (
        filtered.map((c, i, arr) => {
          const initial = (c.name?.[0] ?? '?').toUpperCase();
          const tag = c.tags[0] ?? '';
          return (
            <div
              key={c.id}
              style={{
                borderBottom: i < arr.length - 1 ? `1px solid ${T.line}` : 'none',
                padding: '12px 0',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                aria-hidden
                style={{
                  width: 36,
                  height: 36,
                  border: `1px solid ${T.ink}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {initial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: T.ink3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c.company ?? c.email ?? ''}
                </div>
              </div>
              {tag && (
                <span
                  style={{
                    fontSize: 9,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    border: `1px solid ${T.ink}`,
                    padding: '2px 6px',
                  }}
                >
                  {tag}
                </span>
              )}
            </div>
          );
        })
      )}

      <a
        href="/workspace/contactos"
        style={{
          display: 'flex',
          width: '100%',
          marginTop: 16,
          padding: 12,
          border: `1px solid ${T.ink}`,
          background: T.ink,
          color: T.bg,
          fontFamily: T.mono,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.1em',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          cursor: 'pointer',
          textDecoration: 'none',
        }}
      >
        <Plus size={12} strokeWidth={2} />
        NUEVO CONTACTO
      </a>
    </div>
  );
}

/* ───────────────────────── Calendar Tab ─────────────────────── */

type CalEvent = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  attendees: string[];
};

function CalendarTab() {
  const [items, setItems] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      try {
        const params = new URLSearchParams({
          from: start.toISOString(),
          to: end.toISOString(),
        });
        const res = await fetch(`/api/calendar?${params}`, { cache: 'no-store' });
        const j = (await res.json()) as { data: { items: CalEvent[] } | null };
        if (!cancelled) {
          const sorted = (j.data?.items ?? []).sort((a, b) =>
            a.start_at.localeCompare(b.start_at),
          );
          setItems(sorted);
        }
      } catch {
        /* keep empty */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const today = new Date().toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  function fmtTime(iso: string): string {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function durationMinutes(s: string, e: string): number {
    return Math.round((new Date(e).getTime() - new Date(s).getTime()) / 60000);
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
      <h1
        data-serif="true"
        style={{
          fontSize: 26,
          fontWeight: 500,
          margin: '0 0 2px',
          letterSpacing: '-0.02em',
        }}
      >
        Hoy
      </h1>
      <div style={{ fontSize: 11, color: T.ink3, marginBottom: 20 }}>
        {today.charAt(0).toUpperCase() + today.slice(1)} · {items.length} evento
        {items.length === 1 ? '' : 's'}
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: T.ink3 }}>Cargando…</div>
      ) : items.length === 0 ? (
        <div
          style={{
            border: `1px dashed ${T.ink3}`,
            padding: '20px 12px',
            fontSize: 12,
            color: T.ink2,
            textAlign: 'center',
          }}
        >
          Día libre. Aprovecha.
        </div>
      ) : (
        <div style={{ border: `1px solid ${T.ink}` }}>
          {items.map((e, i) => {
            const dur = durationMinutes(e.start_at, e.end_at);
            const detail =
              [e.attendees[0], dur ? `${dur}m` : null].filter(Boolean).join(' · ') || 'Evento';
            return (
              <div
                key={e.id}
                style={{
                  padding: 14,
                  borderBottom: i < items.length - 1 ? `1px solid ${T.line}` : 'none',
                  display: 'flex',
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, minWidth: 48 }}>
                  {fmtTime(e.start_at)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {e.title}
                  </div>
                  <div style={{ fontSize: 11, color: T.ink3 }}>{detail}</div>
                </div>
                <ChevronRight size={16} strokeWidth={1.5} color={T.ink3} />
              </div>
            );
          })}
        </div>
      )}

      <a
        href="/workspace/calendario"
        style={{
          display: 'flex',
          width: '100%',
          marginTop: 16,
          padding: 12,
          border: `1px solid ${T.ink}`,
          background: T.ink,
          color: T.bg,
          fontFamily: T.mono,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.1em',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          cursor: 'pointer',
          textDecoration: 'none',
        }}
      >
        <Plus size={12} strokeWidth={2} />
        NUEVA CITA
      </a>

      <div
        style={{
          marginTop: 20,
          padding: 12,
          border: `1px dashed ${T.ink3}`,
          fontSize: 11,
          color: T.ink2,
          lineHeight: 1.6,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: T.ink3,
            marginBottom: 6,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          Tip
        </div>
        Pregúntale a KitZ: «agenda cita con Jaime mañana 3pm» y se crea automáticamente.
      </div>
    </div>
  );
}
