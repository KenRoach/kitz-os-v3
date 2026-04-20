'use client';

/**
 * PushToggle — one-button Japandi toggle for Web Push notifications.
 *
 * Flips between "Activar alertas" (default) and "Alertas activas"
 * (granted). When 'denied' or 'unsupported', renders nothing — there's
 * no UX value in showing a disabled toggle the user can't fix without
 * digging into browser settings.
 *
 * Drop it into the shell footer, settings page, or setup checklist
 * — it's self-contained and only depends on the usePush hook.
 */

import { usePush } from './use-push';

export function PushToggle({
  device = 'desktop',
  size = 'sm',
}: {
  device?: 'desktop' | 'mobile';
  size?: 'sm' | 'md';
}): React.ReactElement | null {
  const { state, enable, disable } = usePush(device);

  if (state === 'unsupported' || state === 'denied') return null;

  const active = state === 'granted';
  const pad = size === 'sm' ? '0.35rem 0.65rem' : '0.5rem 0.85rem';
  const font = size === 'sm' ? '0.7rem' : '0.75rem';

  return (
    <button
      type="button"
      onClick={() => (active ? void disable() : void enable())}
      aria-pressed={active}
      title={
        active
          ? 'Desactivar alertas push'
          : 'Activar alertas push del sistema (WhatsApp, facturas pagadas)'
      }
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: pad,
        background: active ? 'var(--kitz-ink, #111)' : 'var(--kitz-bg, #F9F6EF)',
        color: active ? 'var(--kitz-bg, #F9F6EF)' : 'var(--kitz-ink, #111)',
        border: '1px solid var(--kitz-ink, #111)',
        fontFamily: 'var(--kitz-font-mono, ui-monospace)',
        fontSize: font,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        fontWeight: 600,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: active ? 'var(--kitz-moss, #7a8b6f)' : 'var(--kitz-ink-3, #999)',
          display: 'inline-block',
        }}
      />
      {active ? 'Alertas activas' : 'Activar alertas'}
    </button>
  );
}
