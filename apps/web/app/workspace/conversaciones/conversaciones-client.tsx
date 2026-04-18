'use client';

import { useCallback, useEffect, useState } from 'react';
import type { WhatsAppSession } from '@kitz/db';
import { WHATSAPP_STATUS_LABELS, type WhatsAppStatus } from '@kitz/db/whatsapp-statuses';

type SessionResponse = {
  success: boolean;
  data: WhatsAppSession | null;
  error: string | null;
};

type StubMessage = {
  id: string;
  from: string;
  preview: string;
  receivedAt: string;
};

// Placeholder inbox until Baileys is wired. Shows the shape; empty by design.
const STUB_MESSAGES: StubMessage[] = [];

function statusBadgeStyle(status: WhatsAppStatus): React.CSSProperties {
  const connected = status === 'connected';
  const warn = status === 'awaiting_scan' || status === 'requesting_qr';
  const bad = status === 'error' || status === 'disconnected';
  return {
    display: 'inline-block',
    padding: '0.15rem 0.5rem',
    border: '1px solid var(--kitz-border)',
    background: connected
      ? 'var(--kitz-text-strong)'
      : warn
        ? 'var(--kitz-muted)'
        : bad
          ? 'var(--kitz-error)'
          : 'var(--kitz-bg)',
    color: connected ? 'var(--kitz-bg)' : bad ? 'var(--kitz-bg)' : 'var(--kitz-text-strong)',
    fontFamily: 'var(--kitz-font-mono)',
    fontSize: '0.65rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  };
}

export default function ConversacionesClient() {
  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp/status');
      const body = (await res.json()) as SessionResponse;
      setSession(body.data);
      if (!body.success) setError(body.error ?? 'status_failed');
      else setError(null);
    } catch {
      setError('network_error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function post(path: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, { method: 'POST' });
      const body = (await res.json()) as SessionResponse;
      if (!body.success) setError(body.error ?? 'request_failed');
      setSession(body.data ?? session);
    } catch {
      setError('network_error');
    } finally {
      setBusy(false);
    }
  }

  const connect = () => post('/api/whatsapp/connect');
  const simulate = () => post('/api/whatsapp/simulate-scan');
  const disconnect = () => post('/api/whatsapp/disconnect');

  const status: WhatsAppStatus = session?.status ?? 'idle';
  const canConnect =
    status === 'idle' ||
    status === 'disconnected' ||
    status === 'error' ||
    status === 'awaiting_scan';
  const showSimulate = status === 'awaiting_scan' && process.env.NODE_ENV !== 'production';

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
          kitz inbox
        </p>
        <h1 style={{ marginBottom: '0.25rem' }}>Conversaciones</h1>
        <p className="kz-mute">
          WhatsApp vía Baileys. Un solo número por espacio. Mensajes entrantes caen en esta bandeja.
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(18rem, 26rem) 1fr',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        <section
          className="kz-panel"
          style={{ padding: '1.25rem', display: 'grid', gap: '0.75rem' }}
        >
          <p className="kz-mute kz-prompt" style={{ margin: 0 }}>
            kitz whatsapp
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={statusBadgeStyle(status)}>{WHATSAPP_STATUS_LABELS[status]}</span>
            {loading && <span className="kz-mute">cargando…</span>}
          </div>

          {session?.phone && (
            <p className="kz-mute" style={{ margin: 0 }}>
              Teléfono: <span style={{ color: 'var(--kitz-text-strong)' }}>{session.phone}</span>
            </p>
          )}

          {session?.last_error && <p className="kz-error">{session.last_error}</p>}
          {error && <p className="kz-error">{error}</p>}

          {status === 'awaiting_scan' && session?.qr_data_url && (
            <div
              style={{
                border: '1px solid var(--kitz-border)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={session.qr_data_url}
                alt="QR de WhatsApp"
                width={160}
                height={160}
                style={{
                  imageRendering: 'pixelated',
                  border: '1px solid var(--kitz-border)',
                }}
              />
              <p className="kz-mute" style={{ margin: 0, fontSize: '0.7rem', textAlign: 'center' }}>
                Abre WhatsApp → Ajustes → Dispositivos vinculados →
                <br />
                Vincular un dispositivo y escanea este código.
              </p>
              {session.qr_expires_at && (
                <p className="kz-mute" style={{ margin: 0, fontSize: '0.6rem' }}>
                  Expira {new Date(session.qr_expires_at).toLocaleTimeString()}
                </p>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {canConnect && (
              <button
                type="button"
                onClick={connect}
                disabled={busy}
                className="kz-button"
                style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.75rem' }}
              >
                {busy ? '…' : status === 'awaiting_scan' ? 'Regenerar QR' : 'Conectar WhatsApp'}
              </button>
            )}
            {showSimulate && (
              <button
                type="button"
                onClick={simulate}
                disabled={busy}
                className="kz-button kz-button-ghost"
                style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                title="Dev-only: simula un escaneo exitoso"
              >
                Simular escaneo
              </button>
            )}
            {status === 'connected' && (
              <button
                type="button"
                onClick={disconnect}
                disabled={busy}
                className="kz-button kz-button-ghost"
                style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.75rem' }}
              >
                Desconectar
              </button>
            )}
          </div>
        </section>

        <section
          className="kz-panel"
          style={{ padding: '1.25rem', display: 'grid', gap: '0.75rem' }}
        >
          <p className="kz-mute kz-prompt" style={{ margin: 0 }}>
            kitz messages
          </p>
          <h2 style={{ margin: 0, fontSize: '1rem' }}>Bandeja</h2>
          {status !== 'connected' ? (
            <p className="kz-mute">Conecta WhatsApp para recibir mensajes aquí.</p>
          ) : STUB_MESSAGES.length === 0 ? (
            <p className="kz-mute">
              Sin mensajes todavía. Cuando llegue un mensaje real lo verás en esta lista.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {STUB_MESSAGES.map((m) => (
                <li
                  key={m.id}
                  style={{
                    padding: '0.5rem 0',
                    borderBottom: '1px solid var(--kitz-border)',
                  }}
                >
                  <p style={{ margin: 0, color: 'var(--kitz-text-strong)', fontSize: '0.8125rem' }}>
                    {m.from}
                  </p>
                  <p className="kz-mute" style={{ margin: 0, fontSize: '0.7rem' }}>
                    {m.preview}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
