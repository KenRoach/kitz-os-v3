'use client';

import { usePathname } from 'next/navigation';
import { modeForPath } from './nav-config';

/**
 * Right-side inspector. Mounts only when the active mode is 'canvas',
 * matching the design where artifact-style pages get a properties pane
 * and operational pages do not.
 *
 * Per-page inspectors land in follow-up commits. For now this renders
 * a generic placeholder pane so the 3-column shell is visible.
 */
export default function InspectorRail() {
  const pathname = usePathname();
  const mode = modeForPath(pathname);
  if (mode !== 'canvas') return null;

  return (
    <aside
      style={{
        width: 'clamp(16rem, 18vw, 22rem)',
        height: '100%',
        borderLeft: '1px solid var(--kitz-border)',
        background: 'var(--kitz-bg)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflowY: 'auto',
      }}
    >
      <header
        style={{
          padding: '0.6rem 0.85rem',
          borderBottom: '1px solid var(--kitz-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--kitz-font-mono)',
            fontSize: '0.65rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--kitz-text-strong)',
          }}
        >
          Inspector
        </span>
      </header>

      <div
        style={{
          padding: '0.85rem',
          fontSize: '0.75rem',
          color: 'var(--kitz-text-dim)',
          lineHeight: 1.55,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        <Section title="Theme">
          <Pill label="Dark" active />
          <Pill label="Light" />
        </Section>
        <Section title="Breakpoint">
          <Pill label="Desktop" />
          <Pill label="Tablet" active />
          <Pill label="Mobile" />
        </Section>
        <Section title="Properties">
          <p style={{ margin: 0, fontSize: '0.7rem' }}>
            Selecciona un artefacto para ver sus controles.
          </p>
        </Section>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <h3
        style={{
          margin: 0,
          fontSize: '0.6rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--kitz-text)',
          fontWeight: 600,
        }}
      >
        {title}
      </h3>
      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>{children}</div>
    </section>
  );
}

function Pill({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      style={{
        padding: '0.2rem 0.55rem',
        fontSize: '0.65rem',
        border: '1px solid var(--kitz-border)',
        background: active ? 'var(--kitz-text-strong)' : 'var(--kitz-bg)',
        color: active ? 'var(--kitz-bg)' : 'var(--kitz-text)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        cursor: 'pointer',
      }}
    >
      {label}
    </span>
  );
}
