// @ts-nocheck
/* eslint-disable */
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, Paperclip, Camera, Send, Home, Users, Calendar, FileText,
  ChevronRight, Plus, Search, Bell, Check, MessageSquare,
  Moon, Maximize2, Settings
} from 'lucide-react';

/* =========================================================
   KitZ tokens — mono terminal (75%) + Japandi warmth (25%)
   - Blanco hueso (bone white) background
   - Moss for success, warm gold for brand prefixes
   - ONE serif moment: page titles only
   ========================================================= */
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
  mossLight: '#E8EDE5',
  accent: '#A68B5B',
  accentLight: '#F0E8D8',
  danger: '#B54A4A',
  mono: "'JetBrains Mono', 'Menlo', 'Courier New', monospace",
  serif: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
  body: "'JetBrains Mono', 'Menlo', monospace",
};

/* ── Shared CSS injected once ── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Cormorant+Garamond:wght@400;500;600&display=swap');

  /* Font inheritance lock */
  input, button, textarea, select {
    font-family: ${T.mono};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  ::placeholder { font-family: ${T.mono}; opacity: 0.45; }

  /* ── INTERACTION LAYER ── */

  /* All interactive elements get smooth transitions */
  .k-btn, .k-nav, .k-card, .k-input, .k-tab, .k-chip, .k-stat {
    transition: background 180ms ease, color 180ms ease,
                border-color 180ms ease, box-shadow 180ms ease,
                transform 120ms ease;
  }

  /* Buttons — lift on hover, press on active */
  .k-btn:hover {
    background: ${T.sunk} !important;
  }
  .k-btn:active {
    transform: scale(0.97);
  }
  .k-btn-primary:hover {
    background: ${T.ink2} !important;
  }
  .k-btn-primary:active {
    transform: scale(0.97);
  }

  /* Keyboard focus ring — always visible for a11y */
  .k-btn:focus-visible, .k-nav:focus-visible, .k-input:focus-visible,
  .k-tab:focus-visible, .k-chip:focus-visible {
    outline: 2px solid ${T.accent};
    outline-offset: 2px;
  }

  /* Nav items — left border slides in */
  .k-nav {
    position: relative;
  }
  .k-nav::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 2px;
    background: ${T.ink};
    transform: scaleY(0);
    transition: transform 200ms ease;
  }
  .k-nav:hover::before,
  .k-nav[data-active="true"]::before {
    transform: scaleY(1);
  }
  .k-nav:hover {
    background: ${T.sunk} !important;
  }

  /* Cards — subtle lift on hover */
  .k-card:hover {
    box-shadow: 0 2px 8px rgba(26, 26, 26, 0.06);
  }

  /* Stat cells — gold accent line on hover */
  .k-stat {
    position: relative;
    overflow: hidden;
  }
  .k-stat::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 2px;
    background: ${T.accent};
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 250ms ease;
  }
  .k-stat:hover::after {
    transform: scaleX(1);
  }
  .k-stat:hover {
    background: ${T.sunk} !important;
  }

  /* Chips / quick actions — invert on hover */
  .k-chip:hover {
    background: ${T.ink} !important;
    color: ${T.bg} !important;
  }
  .k-chip:hover svg { stroke: ${T.bg}; }

  /* Tabs — clean underline transition */
  .k-tab[data-active="true"] {
    background: ${T.ink} !important;
    color: ${T.bg} !important;
  }

  /* Input focus — border darkens */
  .k-input:focus-within {
    border-color: ${T.ink} !important;
  }

  /* ── CHAT MESSAGE ENTRANCE ── */
  @keyframes kitzMsgIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .k-msg { animation: kitzMsgIn 280ms ease-out both; }

  /* ── TYPING INDICATOR ── */
  @keyframes kitzDot {
    0%, 60%, 100% { opacity: 0.2; transform: translateY(0); }
    30%           { opacity: 1;   transform: translateY(-3px); }
  }
  .k-typing-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: ${T.ink3};
    display: inline-block;
  }
  .k-typing-dot:nth-child(1) { animation: kitzDot 1.2s ease infinite 0ms; }
  .k-typing-dot:nth-child(2) { animation: kitzDot 1.2s ease infinite 160ms; }
  .k-typing-dot:nth-child(3) { animation: kitzDot 1.2s ease infinite 320ms; }

  /* ── RECORDING PULSE ── */
  @keyframes kitzPulse {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.3; }
  }

  /* ── SWIPE HINT ── */
  @keyframes kitzSwipeHint {
    0%   { transform: translateX(0); }
    18%  { transform: translateX(-10px); }
    36%  { transform: translateX(0); }
    54%  { transform: translateX(-6px); }
    72%  { transform: translateX(0); }
    100% { transform: translateX(0); }
  }
  .swipe-hint-rail {
    animation: kitzSwipeHint 3.2s ease-in-out 1.4s 2;
    will-change: transform;
  }
  .swipe-hint-rail:active,
  .swipe-hint-wrap:hover .swipe-hint-rail {
    animation: none;
  }

  /* ── BACKGROUND GRAIN — Japandi texture ── */
  .k-grain::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    opacity: 0.035;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 128px 128px;
    z-index: 9999;
  }

  /* ── SCROLLBAR — minimal ── */
  .k-scroll::-webkit-scrollbar { width: 4px; }
  .k-scroll::-webkit-scrollbar-track { background: transparent; }
  .k-scroll::-webkit-scrollbar-thumb { background: ${T.line}; }
  .k-scroll::-webkit-scrollbar-thumb:hover { background: ${T.ink3}; }

  /* ── REDUCED MOTION ── */
  @media (prefers-reduced-motion: reduce) {
    .k-btn, .k-nav, .k-card, .k-input, .k-tab, .k-chip, .k-stat,
    .k-msg, .swipe-hint-rail, .k-typing-dot {
      animation: none !important;
      transition: none !important;
    }
  }
`;

/* ── K monogram ── */
function KMark({ size = 20, inverse = false }: { size?: number; inverse?: boolean }) {
  return (
    <div style={{
      width: size, height: size,
      background: inverse ? T.bg : T.ink,
      color: inverse ? T.ink : T.bg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, fontFamily: T.mono,
      fontSize: Math.round(size * 0.65),
      fontWeight: 700, lineHeight: 1,
      transition: 'background 180ms ease, color 180ms ease',
    }}>K</div>
  );
}

/* ── Typing indicator ── */
function TypingIndicator() {
  return (
    <div className="k-msg" style={{
      alignSelf: 'flex-start', maxWidth: '85%',
    }}>
      <div style={{
        fontSize: 9, color: T.ink3,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        marginBottom: 4,
      }}>
        KITZ
      </div>
      <div style={{
        border: `1px solid ${T.line}`,
        padding: '12px 16px',
        background: T.bg,
        display: 'flex', gap: 4, alignItems: 'center',
      }}>
        <span className="k-typing-dot" />
        <span className="k-typing-dot" />
        <span className="k-typing-dot" />
      </div>
    </div>
  );
}

export default function Kitz() {
  const [device, setDevice] = useState('desktop');
  return (
    <div className="k-grain" style={{
      background: '#2a2a2a', minHeight: '100vh',
      padding: '24px 16px', fontFamily: T.mono,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 20,
    }}>
      <style>{GLOBAL_CSS}</style>

      <div style={{
        display: 'inline-flex', padding: 2,
        background: '#1a1a1a', border: '1px solid #3a3a3a',
      }}>
        {(['mobile', 'desktop'] as const).map(d => (
          <button key={d} className="k-btn" onClick={() => setDevice(d)} style={{
            padding: '7px 20px', border: 'none',
            background: device === d ? T.bg : 'transparent',
            color: device === d ? T.ink : '#888',
            fontSize: 10, fontFamily: T.mono,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            fontWeight: device === d ? 600 : 400,
            cursor: 'pointer',
          }}>
            {d}
          </button>
        ))}
      </div>

      {device === 'mobile' ? <Mobile /> : <Desktop />}

      <div style={{
        color: '#666', fontSize: 10, fontFamily: T.mono,
        letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>
        $ kitz v3 workspace
      </div>
    </div>
  );
}

/* =========================================================
   MOBILE
   ========================================================= */
function Mobile() {
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState([
    { id: 1, from: 'kitz' as const, time: '15:23', text: 'Kitz, tu asistente personal.\n\n\u00bfEn qu\u00e9 te ayudo?' },
  ]);
  const [input, setInput] = useState('');
  const [recording, setRecording] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const quickActions = [
    { id: 'brain', label: 'Brain dump', icon: Mic, cmd: 'Grabando brain dump\u2026' },
    { id: 'upload', label: 'Subir doc', icon: Paperclip, cmd: 'Subir documento' },
    { id: 'appt', label: 'Nueva cita', icon: Calendar, cmd: 'Crear nueva cita' },
    { id: 'quote', label: 'Cotizaci\u00f3n', icon: FileText, cmd: 'Generar cotizaci\u00f3n' },
    { id: 'contact', label: 'Contacto', icon: Users, cmd: 'Agregar nuevo contacto' },
    { id: 'agenda', label: 'Hoy', icon: Calendar, cmd: '\u00bfQu\u00e9 tengo hoy?' },
    { id: 'wa', label: 'WhatsApp', icon: MessageSquare, cmd: 'Mostrar WhatsApp' },
    { id: 'report', label: 'Reporte', icon: FileText, cmd: 'Reporte semanal' },
  ];

  const responses: Record<string, string> = {
    '\u00bfQu\u00e9 tengo hoy?': 'Hoy tienes 3 eventos:\n\n10:00 \u2014 Reuni\u00f3n ProWall (Jaime)\n14:30 \u2014 Llamada con Lital (legal)\n17:00 \u2014 Demo RenewFlow',
    'Crear nueva cita': '\u00bfCon qui\u00e9n y a qu\u00e9 hora?\n\nPuedes decirme "cita con Jaime ma\u00f1ana 3pm".',
    'Generar cotizaci\u00f3n': '\u00bfPara qu\u00e9 cliente y qu\u00e9 servicio?\n\nPuedo usar la plantilla de ProWall o empezar de cero.',
    'Agregar nuevo contacto': 'Dame el nombre, empresa y WhatsApp.\n\nPuedo importar desde una tarjeta de presentaci\u00f3n si subes la foto.',
    'Mostrar WhatsApp': 'Tienes 2 conversaciones sin responder:\n\nJaime Madrid \u2014 hace 12m\nEdilberto Garc\u00eda \u2014 hace 1h',
    'Reporte semanal': 'Generando reporte\u2026\n\n\u00bfLo quieres como PDF, Excel o resumen en chat?',
    'Subir documento': 'Toca el clip abajo o arrastra tu archivo.\n\nLo leo y te digo qu\u00e9 hago con \u00e9l.',
    'Grabando brain dump\u2026': 'Mant\u00e9n presionado el micr\u00f3fono.\n\nTranscribo y extraigo tareas, citas y contactos.',
  };

  const send = useCallback((text: string) => {
    if (!text.trim()) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setMessages(m => [...m, { id: Date.now(), from: 'user' as const, time, text }]);
    setInput('');
    setShowAttach(false);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const reply = responses[text] || 'Entendido. Procesando\u2026';
      const d = new Date();
      const replyTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      setMessages(m => [...m, { id: Date.now() + 1, from: 'kitz' as const, time: replyTime, text: reply }]);
    }, 800 + Math.random() * 600);
  }, []);

  const handleAction = useCallback((a: typeof quickActions[number]) => {
    if (a.id === 'brain') {
      setRecording(true);
      setTimeout(() => setRecording(false), 1500);
    }
    send(a.cmd);
  }, [send]);

  return (
    <div style={{
      width: 390, height: 844, background: '#0a0a0a',
      borderRadius: 44, padding: 10,
      boxShadow: '0 50px 100px rgba(0,0,0,0.5), 0 0 0 2px #222 inset',
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: 36,
        background: T.bg, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        border: `1px solid ${T.line}`,
      }}>
        {/* Header */}
        <header style={{
          borderBottom: `1px solid ${T.ink}`,
          padding: '14px 16px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: T.bg,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <KMark size={18} />
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.02em' }}>
              KitZ
            </span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            fontSize: 11, color: T.ink3,
          }}>
            <span style={{
              padding: '2px 8px',
              border: `1px solid ${T.line}`,
              fontSize: 10, fontWeight: 500,
            }}>100 cr</span>
            <Bell size={14} strokeWidth={1.5} style={{ cursor: 'pointer' }} />
            <Search size={14} strokeWidth={1.5} style={{ cursor: 'pointer' }} />
          </div>
        </header>

        {/* Context strip */}
        <div style={{
          padding: '8px 16px',
          borderBottom: `1px solid ${T.line}`,
          display: 'flex', justifyContent: 'space-between',
          fontSize: 10, color: T.ink3,
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          <span>$ kitz owner</span>
          <span>Dom 19 Abr 15:23</span>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'chat' && (
            <MobileChat
              messages={messages}
              messagesEndRef={messagesEndRef}
              recording={recording}
              typing={typing}
            />
          )}
          {activeTab === 'dashboard' && <MobileDashboard />}
          {activeTab === 'contacts' && <MobileContacts />}
          {activeTab === 'calendar' && <MobileCalendar />}
        </div>

        {/* Chat dock (only on chat tab) */}
        {activeTab === 'chat' && (
          <div style={{ borderTop: `1px solid ${T.ink}`, background: T.bg }}>
            {/* Suggestions rail */}
            <div style={{ padding: '10px 16px 8px', borderBottom: `1px solid ${T.line}` }}>
              <div style={{
                fontSize: 9, color: T.ink3,
                letterSpacing: '0.1em', marginBottom: 8,
                textTransform: 'uppercase',
              }}>
                Sugerencias
              </div>
              <div className="swipe-hint-wrap" style={{ position: 'relative' }}>
                <div className="swipe-hint-rail k-scroll" style={{
                  display: 'flex', gap: 6,
                  overflowX: 'auto', paddingBottom: 4,
                  scrollbarWidth: 'none',
                }}>
                  {quickActions.map(a => {
                    const Icon = a.icon;
                    return (
                      <button key={a.id} className="k-chip" onClick={() => handleAction(a)} style={{
                        flexShrink: 0, display: 'flex',
                        alignItems: 'center', gap: 5,
                        padding: '6px 10px',
                        border: `1px solid ${T.ink}`,
                        background: T.bg, color: T.ink,
                        fontFamily: T.mono, fontSize: 11,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}>
                        <Icon size={11} strokeWidth={1.5} />
                        {a.label}
                      </button>
                    );
                  })}
                </div>
                <div style={{
                  position: 'absolute', top: 0, right: 0, bottom: 4,
                  width: 32, pointerEvents: 'none',
                  background: `linear-gradient(to right, transparent, ${T.bg})`,
                }} />
              </div>
            </div>

            {/* Attach tray */}
            {showAttach && (
              <div style={{
                padding: '12px 16px',
                borderBottom: `1px solid ${T.line}`,
                display: 'flex', gap: 8,
                background: T.sunk,
              }}>
                {[
                  { icon: FileText, label: 'PDF / Doc' },
                  { icon: FileText, label: 'Excel' },
                  { icon: Camera, label: 'Foto' },
                  { icon: Paperclip, label: 'Archivo' },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <button key={i} className="k-btn" onClick={() => send(`Subiendo ${item.label}\u2026`)} style={{
                      flex: 1, padding: '10px 6px',
                      border: `1px solid ${T.ink}`,
                      background: T.bg, color: T.ink,
                      fontFamily: T.mono, fontSize: 10,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 4,
                      cursor: 'pointer',
                    }}>
                      <Icon size={14} strokeWidth={1.5} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Input row */}
            <div style={{
              padding: '10px 12px 12px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <button className="k-btn" onClick={() => setShowAttach(!showAttach)} style={{
                width: 36, height: 36,
                border: `1px solid ${T.ink}`,
                background: showAttach ? T.ink : T.bg,
                color: showAttach ? T.bg : T.ink,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}>
                <Paperclip size={15} strokeWidth={1.5} />
              </button>

              <div className="k-input" style={{
                flex: 1, border: `1px solid ${T.line}`,
                display: 'flex', alignItems: 'center',
                padding: '0 10px', height: 36,
                background: T.bg,
              }}>
                <span style={{ color: T.ink3, marginRight: 6, fontSize: 13 }}>&rsaquo;</span>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') send(input); }}
                  placeholder="Escribe a KitZ\u2026"
                  style={{
                    flex: 1, border: 'none', outline: 'none',
                    background: 'transparent',
                    fontFamily: T.mono, fontSize: 13, color: T.ink,
                  }}
                />
              </div>

              <button
                className="k-btn"
                onTouchStart={() => setRecording(true)}
                onTouchEnd={() => setRecording(false)}
                onMouseDown={() => setRecording(true)}
                onMouseUp={() => setRecording(false)}
                onMouseLeave={() => setRecording(false)}
                style={{
                  width: 36, height: 36,
                  border: `1px solid ${T.ink}`,
                  background: recording ? T.ink : T.bg,
                  color: recording ? T.bg : T.ink,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                }}>
                <Mic size={15} strokeWidth={1.5} />
              </button>

              <button className="k-btn k-btn-primary" onClick={() => send(input)} style={{
                height: 36, padding: '0 12px',
                border: `1px solid ${T.ink}`,
                background: T.ink, color: T.bg,
                fontFamily: T.mono, fontSize: 11,
                letterSpacing: '0.05em', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
                cursor: 'pointer', flexShrink: 0,
              }}>
                ENVIAR
                <Send size={11} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}

        {/* Bottom nav */}
        <nav style={{
          borderTop: `1px solid ${T.ink}`, background: T.bg,
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>
          {[
            { id: 'chat', label: 'Chat', icon: 'kmark' as const },
            { id: 'dashboard', label: 'Panel', icon: Home },
            { id: 'contacts', label: 'Contactos', icon: Users },
            { id: 'calendar', label: 'Agenda', icon: Calendar },
          ].map((tab, i) => {
            const isKmark = tab.icon === 'kmark';
            const Icon = isKmark ? null : tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} className="k-tab" data-active={active} onClick={() => setActiveTab(tab.id)} style={{
                padding: '10px 0 12px', border: 'none',
                background: active ? T.ink : 'transparent',
                color: active ? T.bg : T.ink,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 4,
                cursor: 'pointer', fontFamily: T.mono, fontSize: 9,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                borderRight: i < 3 ? `1px solid ${T.line}` : 'none',
              }}>
                {isKmark ? (
                  <KMark size={16} inverse={active} />
                ) : (
                  Icon && <Icon size={16} strokeWidth={1.5} />
                )}
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/* ── Mobile Chat ── */
function MobileChat({ messages, messagesEndRef, recording, typing }: {
  messages: { id: number; from: 'kitz' | 'user'; time: string; text: string }[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  recording: boolean;
  typing: boolean;
}) {
  return (
    <div className="k-scroll" style={{
      flex: 1, overflowY: 'auto', padding: 16,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {messages.map(m => (
        <div key={m.id} className="k-msg" style={{
          alignSelf: m.from === 'kitz' ? 'flex-start' : 'flex-end',
          maxWidth: '85%',
        }}>
          <div style={{
            fontSize: 9, color: T.ink3,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            marginBottom: 4,
            textAlign: m.from === 'user' ? 'right' : 'left',
          }}>
            {m.from === 'kitz' ? 'KITZ' : 'T\u00da'} {m.time}
          </div>
          <div style={{
            border: `1px solid ${m.from === 'user' ? T.ink : T.line}`,
            padding: '10px 12px',
            fontSize: 13, lineHeight: 1.55,
            background: m.from === 'user' ? T.ink : T.bg,
            color: m.from === 'user' ? T.bg : T.ink,
            whiteSpace: 'pre-wrap',
          }}>
            {m.text}
          </div>
        </div>
      ))}
      {typing && <TypingIndicator />}
      {recording && (
        <div style={{
          alignSelf: 'center',
          border: `1px solid ${T.ink}`,
          padding: '8px 14px', fontSize: 11,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: T.danger,
            animation: 'kitzPulse 1s infinite',
          }} />
          Grabando\u2026
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

/* ── Mobile Dashboard ── */
function MobileDashboard() {
  return (
    <div className="k-scroll" style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
      <h1 data-serif="true" style={{
        fontSize: 26, fontWeight: 500, margin: '0 0 2px',
        letterSpacing: '-0.02em', lineHeight: 1.1,
      }}>
        Dashboard
      </h1>
      <div style={{ fontSize: 10, color: T.ink3, marginBottom: 20 }}>KitZ owner</div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 0, border: `1px solid ${T.ink}`, marginBottom: 20,
      }}>
        {[
          { label: 'CONTACTOS', value: '0' },
          { label: 'CONVERSACIONES', value: '0' },
          { label: 'AGENTES', value: '3' },
          { label: 'CR\u00c9DITOS IA', value: '100', sub: '100% de 100' },
        ].map((stat, i) => (
          <div key={i} className="k-stat" style={{
            padding: '14px 12px',
            borderRight: i % 2 === 0 ? `1px solid ${T.line}` : 'none',
            borderBottom: i < 2 ? `1px solid ${T.line}` : 'none',
            cursor: 'default',
          }}>
            <div style={{ fontSize: 9, color: T.ink3, letterSpacing: '0.1em', marginBottom: 6 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{stat.value}</div>
            {stat.sub && <div style={{ fontSize: 9, color: T.ink3, marginTop: 2 }}>{stat.sub}</div>}
          </div>
        ))}
      </div>

      <div className="k-card" style={{ border: `1px solid ${T.ink}`, padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, fontFamily: T.mono }}>Checklist</h2>
          <div style={{
            fontSize: 10, color: T.ink,
            padding: '2px 8px', border: `1px solid ${T.ink}`,
            fontWeight: 600,
          }}>3 / 5</div>
        </div>
        {[
          { text: 'Autenticaci\u00f3n activa', done: true },
          { text: 'Espacio creado', done: true },
          { text: 'Agregar primer contacto', done: false },
          { text: 'Configurar primer agente', done: true },
          { text: 'Conectar WhatsApp', done: false },
        ].map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
            borderBottom: i < 4 ? `1px solid ${T.line}` : 'none',
            fontSize: 13,
            color: item.done ? T.ink3 : T.ink,
          }}>
            <div style={{
              width: 14, height: 14, border: `1px solid ${item.done ? T.moss : T.ink}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: item.done ? T.moss : 'transparent',
              transition: 'background 200ms ease',
            }}>
              {item.done && <Check size={10} color={T.bg} strokeWidth={2} />}
            </div>
            <span style={{ textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</span>
            {!item.done && (
              <button className="k-btn" style={{
                marginLeft: 'auto', fontSize: 9, fontWeight: 600,
                letterSpacing: '0.05em',
                padding: '3px 8px', border: `1px solid ${T.ink}`,
                background: T.bg, color: T.ink, cursor: 'pointer',
                fontFamily: T.mono,
              }}>IR</button>
            )}
          </div>
        ))}
      </div>

      <div className="k-card" style={{ border: `1px solid ${T.ink}`, padding: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px', fontFamily: T.mono }}>Actividad</h2>
        {[
          { time: 'hace 4m', action: 'seeded_workpack', detail: 'appointments' },
          { time: 'hace 4m', action: 'cre\u00f3 el espacio', detail: 'kitz' },
        ].map((a, i) => (
          <div key={i} style={{
            fontSize: 12, color: T.ink2, padding: '4px 0',
            borderTop: i > 0 ? `1px solid ${T.line}` : 'none',
          }}>
            <span style={{ color: T.ink3, marginRight: 10 }}>{a.time}</span>
            <span style={{ color: T.accent, fontWeight: 600 }}>{a.action}</span>
            {' '}{a.detail}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Mobile Contacts ── */
function MobileContacts() {
  const contacts = [
    { name: 'Jaime Madrid', company: 'ProWall Panam\u00e1', tag: 'prospect', initial: 'J' },
    { name: 'Lital Ben-Zeev', company: 'WGL Legal', tag: 'partner', initial: 'L' },
    { name: 'Edilberto Garc\u00eda', company: 'Code Audit', tag: 'vendor', initial: 'E' },
    { name: 'Rolle', company: 'KitZ Content', tag: 'team', initial: 'R' },
  ];

  const tagColors: Record<string, { border: string; bg: string }> = {
    prospect: { border: T.accent, bg: T.accentLight },
    partner: { border: T.moss, bg: T.mossLight },
    vendor: { border: T.ink3, bg: T.sunk },
    team: { border: T.ink, bg: T.sunk },
  };

  return (
    <div className="k-scroll" style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
      <h1 data-serif="true" style={{
        fontSize: 26, fontWeight: 500, margin: '0 0 16px',
        letterSpacing: '-0.02em',
      }}>Contactos</h1>

      <div className="k-input" style={{
        border: `1px solid ${T.line}`, padding: '10px 12px',
        marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Search size={13} strokeWidth={1.5} color={T.ink3} />
        <span style={{ fontSize: 12, color: T.ink3 }}>Buscar contactos\u2026</span>
      </div>

      {contacts.map((c, i, arr) => {
        const tc = tagColors[c.tag] || tagColors.vendor;
        return (
          <div key={i} className="k-nav" style={{
            borderBottom: i < arr.length - 1 ? `1px solid ${T.line}` : 'none',
            padding: '12px 8px', display: 'flex', alignItems: 'center', gap: 12,
            cursor: 'pointer',
          }}>
            <div style={{
              width: 36, height: 36, border: `1px solid ${T.ink}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700,
            }}>
              {c.initial}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
              <div style={{ fontSize: 11, color: T.ink3 }}>{c.company}</div>
            </div>
            <div style={{
              fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
              border: `1px solid ${tc.border}`,
              background: tc.bg,
              padding: '2px 6px', fontWeight: 500,
            }}>
              {c.tag}
            </div>
          </div>
        );
      })}

      <button className="k-btn k-btn-primary" style={{
        width: '100%', marginTop: 16, padding: 12,
        border: `1px solid ${T.ink}`, background: T.ink, color: T.bg,
        fontFamily: T.mono, fontSize: 11, fontWeight: 600,
        letterSpacing: '0.1em',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        cursor: 'pointer',
      }}>
        <Plus size={12} strokeWidth={2} />
        NUEVO CONTACTO
      </button>
    </div>
  );
}

/* ── Mobile Calendar ── */
function MobileCalendar() {
  const events = [
    { time: '10:00', title: 'Reuni\u00f3n ProWall', detail: 'Jaime Madrid 1h', status: 'upcoming' },
    { time: '14:30', title: 'Llamada Lital', detail: 'WGL Legal 30m', status: 'upcoming' },
    { time: '17:00', title: 'Demo RenewFlow', detail: 'Dell LATAM 45m', status: 'upcoming' },
  ];
  return (
    <div className="k-scroll" style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
      <h1 data-serif="true" style={{
        fontSize: 26, fontWeight: 500, margin: '0 0 2px',
        letterSpacing: '-0.02em',
      }}>Hoy</h1>
      <div style={{ fontSize: 11, color: T.ink3, marginBottom: 20 }}>
        Domingo 19 de Abril 3 eventos
      </div>

      <div style={{ border: `1px solid ${T.ink}` }}>
        {events.map((e, i) => (
          <div key={i} className="k-nav" style={{
            padding: 14,
            borderBottom: i < events.length - 1 ? `1px solid ${T.line}` : 'none',
            display: 'flex', gap: 12, cursor: 'pointer',
          }}>
            <div style={{
              fontSize: 14, fontWeight: 700, minWidth: 48,
              color: T.ink,
            }}>{e.time}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{e.title}</div>
              <div style={{ fontSize: 11, color: T.ink3 }}>{e.detail}</div>
            </div>
            <ChevronRight size={16} strokeWidth={1.5} color={T.ink3} />
          </div>
        ))}
      </div>

      <button className="k-btn k-btn-primary" style={{
        width: '100%', marginTop: 16, padding: 12,
        border: `1px solid ${T.ink}`, background: T.ink, color: T.bg,
        fontFamily: T.mono, fontSize: 11, fontWeight: 600,
        letterSpacing: '0.1em',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        cursor: 'pointer',
      }}>
        <Plus size={12} strokeWidth={2} />
        NUEVA CITA
      </button>

      <div style={{
        marginTop: 20, padding: 12,
        border: `1px solid ${T.line}`,
        background: T.sunk,
        fontSize: 11, color: T.ink2, lineHeight: 1.6,
      }}>
        <div style={{
          fontSize: 10, color: T.accent, marginBottom: 6,
          letterSpacing: '0.05em', textTransform: 'uppercase',
          fontWeight: 600,
        }}>
          Tip
        </div>
        Preg\u00fantale a KitZ: "agenda cita con Jaime ma\u00f1ana 3pm" y se crea autom\u00e1ticamente.
      </div>
    </div>
  );
}

/* =========================================================
   DESKTOP
   ========================================================= */
function Desktop() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [activeTab, setActiveTab] = useState('workspace');
  const [activeLang, setActiveLang] = useState('ES');
  const [chatInput, setChatInput] = useState('');

  return (
    <div style={{
      width: 1320, height: 860, background: T.bg,
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      boxShadow: '0 40px 100px rgba(0,0,0,0.4)',
      border: '1px solid #3a3a3a', fontFamily: T.mono,
    }}>
      {/* Top bar */}
      <div style={{
        height: 48,
        display: 'grid', gridTemplateColumns: '260px 1fr 380px',
        borderBottom: `1px solid ${T.ink}`,
        background: T.bg, flexShrink: 0,
      }}>
        {/* Brand corner */}
        <div style={{
          padding: '0 20px',
          display: 'flex', alignItems: 'center', gap: 10,
          borderRight: `1px solid ${T.line}`,
        }}>
          <KMark size={20} />
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.02em' }}>
            KitZ
          </span>
        </div>

        {/* Command search */}
        <div style={{ padding: '0 20px', display: 'flex', alignItems: 'center' }}>
          <div className="k-input" style={{
            width: '100%',
            border: `1px solid ${T.line}`,
            padding: '6px 12px',
            display: 'flex', alignItems: 'center', gap: 10,
            background: T.bg, cursor: 'text',
          }}>
            <span style={{ color: T.ink3, fontSize: 12 }}>&rsaquo;</span>
            <span style={{ flex: 1, fontSize: 12, color: T.ink3 }}>
              Buscar contactos, tratos\u2026
            </span>
            <span style={{
              fontSize: 10, color: T.ink2,
              padding: '2px 6px',
              border: `1px solid ${T.line}`,
              letterSpacing: '0.05em',
            }}>K</span>
          </div>
        </div>

        {/* Credits */}
        <div style={{
          padding: '0 20px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'flex-end', gap: 12,
          borderLeft: `1px solid ${T.line}`,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px',
            border: `1px solid ${T.ink}`,
            fontSize: 11, color: T.ink,
          }}>
            <div style={{
              width: 22, height: 10,
              border: `1px solid ${T.ink}`,
              position: 'relative', padding: 1,
            }}>
              <div style={{ width: '100%', height: '100%', background: T.ink }} />
              <div style={{
                position: 'absolute', right: -3, top: 2,
                width: 2, height: 4, background: T.ink,
              }} />
            </div>
            100 cr
          </div>
          <button className="k-btn" style={{
            fontSize: 10, color: T.ink2,
            padding: '3px 6px',
            border: `1px solid ${T.line}`,
            background: T.bg,
            letterSpacing: '0.05em', cursor: 'pointer',
          }}>?</button>
        </div>
      </div>

      {/* Body — three columns */}
      <div style={{
        flex: 1,
        display: 'grid', gridTemplateColumns: '260px 1fr 380px',
        overflow: 'hidden',
      }}>
        {/* SIDEBAR */}
        <aside style={{
          background: T.bg,
          borderRight: `1px solid ${T.ink}`,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* WORKSPACE / BRAIN / CANVAS tabs */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            borderBottom: `1px solid ${T.ink}`,
          }}>
            {[
              { id: 'workspace', label: 'WORKSPACE' },
              { id: 'brain', label: 'BRAIN' },
              { id: 'canvas', label: 'CANVAS' },
            ].map((tab, i) => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} className="k-tab" data-active={active}
                  onClick={() => setActiveTab(tab.id)} style={{
                  padding: '12px 4px',
                  background: active ? T.ink : 'transparent',
                  color: active ? T.bg : T.ink2,
                  border: 'none',
                  borderRight: i < 2 ? `1px solid ${T.line}` : 'none',
                  fontFamily: T.mono,
                  fontSize: 10, fontWeight: active ? 600 : 500,
                  letterSpacing: '0.12em',
                  cursor: 'pointer',
                }}>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Nav */}
          <nav className="k-scroll" style={{ padding: '16px 0', flex: 1, overflowY: 'auto' }}>
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'contacts', label: 'Contactos' },
              { id: 'sales', label: 'Ventas' },
              { id: 'chats', label: 'Conversaciones' },
              { id: 'calendar', label: 'Calendario' },
              { id: 'quotes', label: 'Cotizaciones' },
              { id: 'reports', label: 'Reportes' },
            ].map(item => {
              const active = activeNav === item.id;
              return (
                <button key={item.id} className="k-nav" data-active={active}
                  onClick={() => setActiveNav(item.id)} style={{
                  width: '100%',
                  padding: '10px 20px',
                  border: 'none',
                  background: active ? T.sunk : 'transparent',
                  color: active ? T.ink : T.ink2,
                  fontFamily: T.mono, fontSize: 13,
                  cursor: 'pointer', textAlign: 'left',
                  fontWeight: active ? 600 : 400,
                }}>
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* User card */}
          <div style={{ borderTop: `1px solid ${T.ink}`, padding: 16 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{
                fontSize: 10, color: T.ink3, marginBottom: 2,
                letterSpacing: '0.05em',
              }}>
                owner kitz
              </div>
              <div style={{
                fontSize: 12, color: T.ink, fontWeight: 500,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                kenneth_roach@hotmail.com
              </div>
            </div>

            {/* Lang + controls */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center' }}>
              <div style={{ display: 'flex', border: `1px solid ${T.ink}` }}>
                {(['ES', 'EN', 'PT'] as const).map((l, i) => (
                  <button key={l} className="k-tab" data-active={activeLang === l}
                    onClick={() => setActiveLang(l)} style={{
                    padding: '4px 8px', fontSize: 10, fontFamily: T.mono,
                    letterSpacing: '0.05em',
                    background: activeLang === l ? T.ink : 'transparent',
                    color: activeLang === l ? T.bg : T.ink2,
                    border: 'none',
                    borderRight: i < 2 ? `1px solid ${T.ink}` : 'none',
                    cursor: 'pointer', fontWeight: 600,
                  }}>
                    {l}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1 }} />
              {[Moon, Maximize2, Settings].map((Icon, i) => (
                <button key={i} className="k-btn" style={{
                  width: 24, height: 24,
                  border: `1px solid ${T.ink}`,
                  background: T.bg, color: T.ink2,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={11} strokeWidth={1.5} />
                </button>
              ))}
            </div>

            <button className="k-btn" style={{
              width: '100%', padding: 8,
              border: `1px solid ${T.ink}`,
              background: T.bg, color: T.ink,
              fontFamily: T.mono, fontSize: 10, fontWeight: 600,
              letterSpacing: '0.12em', cursor: 'pointer',
            }}>
              CERRAR SESI\u00d3N
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="k-scroll" style={{ overflowY: 'auto', padding: '28px 40px' }}>
          <h1 data-serif="true" style={{
            fontSize: 40, margin: '0 0 6px',
            letterSpacing: '-0.02em', fontWeight: 500,
            lineHeight: 1.05,
          }}>
            {activeNav === 'dashboard' ? 'Dashboard' :
             activeNav === 'contacts' ? 'Contactos' :
             activeNav === 'sales' ? 'Ventas' :
             activeNav === 'chats' ? 'Conversaciones' :
             activeNav === 'calendar' ? 'Calendario' :
             activeNav === 'quotes' ? 'Cotizaciones' : 'Reportes'}
          </h1>
          <div style={{ fontSize: 11, color: T.ink3, marginBottom: 24, letterSpacing: '0.02em' }}>
            KitZ owner
          </div>

          {/* Stat cards */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            border: `1px solid ${T.ink}`, marginBottom: 20,
            background: T.bg,
          }}>
            {[
              { label: 'CONTACTOS', value: '0' },
              { label: 'CONVERSACIONES', value: '0' },
              { label: 'AGENTES', value: '3', sub: 'Luna Marco Nova' },
              { label: 'CR\u00c9DITOS IA', value: '100', sub: '100% de 100' },
            ].map((s, i) => (
              <div key={i} className="k-stat" style={{
                padding: '18px 20px',
                borderRight: i < 3 ? `1px solid ${T.line}` : 'none',
                cursor: 'default',
              }}>
                <div style={{
                  fontSize: 9, color: T.ink3,
                  letterSpacing: '0.12em', marginBottom: 10,
                  fontWeight: 500,
                }}>
                  {s.label}
                </div>
                <div style={{
                  fontSize: 36, lineHeight: 1, fontWeight: 700,
                  marginBottom: s.sub ? 6 : 0,
                }}>
                  {s.value}
                </div>
                {s.sub && (
                  <div style={{ fontSize: 10, color: T.ink3, letterSpacing: '0.02em' }}>
                    {s.sub}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Checklist + Activity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
            {/* Checklist */}
            <div className="k-card" style={{ border: `1px solid ${T.ink}`, padding: 20, background: T.bg }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-end', marginBottom: 16,
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: T.mono }}>
                  Checklist
                </div>
                <div style={{
                  padding: '4px 10px',
                  border: `1px solid ${T.ink}`,
                  fontSize: 11, color: T.ink, fontWeight: 600,
                }}>
                  3 / 5
                </div>
              </div>
              {[
                { text: 'Autenticaci\u00f3n activa', done: true },
                { text: 'Espacio creado', done: true },
                { text: 'Agregar primer contacto', done: false },
                { text: 'Configurar primer agente', done: true },
                { text: 'Conectar WhatsApp', done: false },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0',
                  borderBottom: i < 4 ? `1px solid ${T.line}` : 'none',
                  fontSize: 13,
                  color: item.done ? T.ink3 : T.ink,
                }}>
                  <div style={{
                    width: 16, height: 16,
                    border: `1px solid ${item.done ? T.moss : T.ink3}`,
                    background: item.done ? T.moss : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'background 200ms ease, border-color 200ms ease',
                  }}>
                    {item.done && <Check size={10} color={T.bg} strokeWidth={3} />}
                  </div>
                  <span style={{
                    flex: 1,
                    textDecoration: item.done ? 'line-through' : 'none',
                  }}>
                    {item.text}
                  </span>
                  {!item.done && (
                    <button className="k-btn" style={{
                      fontSize: 10, color: T.ink,
                      background: T.bg,
                      border: `1px solid ${T.ink}`,
                      padding: '4px 10px',
                      cursor: 'pointer', fontFamily: T.mono,
                      letterSpacing: '0.05em',
                      fontWeight: 600,
                    }}>
                      CONFIGURAR
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Activity */}
            <div className="k-card" style={{ border: `1px solid ${T.ink}`, padding: 20, background: T.bg }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, fontFamily: T.mono }}>
                Actividad
              </div>
              {[
                { time: 'hace 4m', action: 'seeded_workpack', detail: 'appointments' },
                { time: 'hace 4m', action: 'cre\u00f3 el espacio', detail: 'kitz' },
                { time: 'hace 12m', action: 'inicializ\u00f3 agentes', detail: '3 activos' },
              ].map((a, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 12, alignItems: 'center',
                  padding: '10px 0',
                  borderTop: i > 0 ? `1px solid ${T.line}` : 'none',
                }}>
                  <div style={{
                    fontSize: 10, color: T.ink3, minWidth: 56,
                    letterSpacing: '0.02em',
                  }}>
                    {a.time}
                  </div>
                  <div style={{ flex: 1, fontSize: 12 }}>
                    <span style={{ color: T.accent, fontWeight: 600 }}>
                      {a.action}
                    </span>
                    <span style={{ color: T.ink3 }}> {a.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* CHAT PANEL */}
        <aside style={{
          background: T.bg,
          borderLeft: `1px solid ${T.ink}`,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Greeting */}
          <div className="k-scroll" style={{
            padding: '20px 20px 16px',
            flex: 1, overflowY: 'auto',
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            <div className="k-msg">
              <div style={{
                fontSize: 10, color: T.ink3,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                marginBottom: 6,
              }}>
                KITZ 15:23
              </div>
              <div style={{
                padding: '10px 14px',
                border: `1px solid ${T.line}`,
                fontSize: 13, lineHeight: 1.55,
                background: T.bg,
              }}>
                Kitz, tu asistente personal.{'\n\n'}\u00bfEn qu\u00e9 te ayudo?
              </div>
            </div>
          </div>

          {/* Suggestions */}
          <div style={{
            padding: '12px 20px 8px',
            borderTop: `1px solid ${T.line}`,
          }}>
            <div style={{
              fontSize: 9, color: T.ink3,
              letterSpacing: '0.12em', fontWeight: 600,
              marginBottom: 10,
            }}>
              SUGERENCIAS
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: 6, marginBottom: 12,
            }}>
              {[
                '\u00bfQu\u00e9 tengo hoy?',
                'Mostrar contactos recientes',
                'Crear una tarea',
                'Resumen semanal',
              ].map((s, i) => (
                <button key={i} className="k-chip" style={{
                  padding: '6px 10px',
                  border: `1px solid ${T.ink}`,
                  background: T.bg, color: T.ink,
                  fontFamily: T.mono, fontSize: 11,
                  cursor: 'pointer', textAlign: 'left',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {s}
                </button>
              ))}
            </div>

            {/* Attach / camera / mic */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {[Paperclip, Camera, Mic].map((Icon, i) => (
                <button key={i} className="k-btn" style={{
                  width: 32, height: 32,
                  border: `1px solid ${T.ink}`,
                  background: T.bg, color: T.ink,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}>
                  <Icon size={14} strokeWidth={1.5} />
                </button>
              ))}
            </div>

            {/* Input + ENVIAR */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <div className="k-input" style={{
                flex: 1, border: `1px solid ${T.line}`,
                background: T.bg, padding: '8px 12px',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ color: T.ink3, fontSize: 13 }}>&rsaquo;</span>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Escribe a KitZ\u2026"
                  style={{
                    flex: 1, border: 'none', outline: 'none',
                    background: 'transparent',
                    fontFamily: T.mono, fontSize: 13, color: T.ink,
                  }}
                />
              </div>
              <button className="k-btn k-btn-primary" style={{
                padding: '0 16px',
                border: `1px solid ${T.ink}`,
                background: T.ink, color: T.bg,
                fontFamily: T.mono, fontSize: 11, fontWeight: 600,
                letterSpacing: '0.1em', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                ENVIAR
                <Send size={11} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '10px 20px 14px',
            borderTop: `1px solid ${T.line}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{
              fontSize: 11, color: T.ink2,
              fontFamily: T.mono,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              Invita a alguien a KitZ
            </span>
            <button className="k-btn" style={{
              fontSize: 10, color: T.ink,
              background: T.bg,
              border: `1px solid ${T.ink}`,
              padding: '4px 10px', cursor: 'pointer',
              fontFamily: T.mono, fontWeight: 600,
              letterSpacing: '0.08em',
            }}>
              COPIAR ENLACE
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
