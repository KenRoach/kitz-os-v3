'use client';

import { useState } from 'react';

type Props = {
  mode: 'sandbox' | 'live';
  hasLive: boolean;
};

/**
 * Top-of-page Stripe-style mode banner.
 *
 * - Sandbox: dark navy strip with "Switch to live account" pill on the right
 * - Live:    hidden (live mode = no chrome interruption)
 *
 * The switch hits POST /api/workspace/mode and reloads so all server
 * components re-resolve their tenant against the new cookie.
 */
export default function SandboxBanner({ mode, hasLive }: Props) {
  const [busy, setBusy] = useState(false);
  if (mode !== 'sandbox') return null;

  const onSwitch = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/workspace/mode', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'live' }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        setBusy(false);
      }
    } catch {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        background: '#0e1f33',
        color: '#f9f6ef',
        padding: '0.55rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexShrink: 0,
        fontSize: '0.75rem',
        fontFamily: 'var(--kitz-font-mono)',
        borderBottom: '1px solid #1a3656',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.15rem 0.5rem',
            border: '1px solid #2d4f78',
            background: '#13294a',
            fontSize: '0.65rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
          aria-label="Modo sandbox activo"
        >
          ▣ Sandbox
        </span>
        <span style={{ opacity: 0.85 }}>
          Estás probando en un sandbox. Los cambios aquí no afectan tu cuenta real.
        </span>
      </div>
      <button
        type="button"
        onClick={onSwitch}
        disabled={busy || !hasLive}
        title={
          !hasLive
            ? 'Tu cuenta real aún no está configurada'
            : 'Cambiar a tu cuenta real'
        }
        style={{
          background: '#f9f6ef',
          color: '#0e1f33',
          border: '1px solid #f9f6ef',
          padding: '0.3rem 0.75rem',
          fontSize: '0.7rem',
          fontFamily: 'var(--kitz-font-mono)',
          letterSpacing: '0.05em',
          fontWeight: 600,
          cursor: busy || !hasLive ? 'not-allowed' : 'pointer',
          opacity: busy || !hasLive ? 0.6 : 1,
          textTransform: 'none',
          flexShrink: 0,
        }}
      >
        {busy ? 'Cambiando…' : 'Cambiar a cuenta real'}
      </button>
    </div>
  );
}
