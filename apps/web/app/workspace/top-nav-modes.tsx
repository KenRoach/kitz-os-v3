'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { SHELL_MODES, modeForPath, type ShellMode } from './nav-config';

const MODE_ROOT: Record<ShellMode, string> = {
  workspace: '/workspace',
  brain: '/workspace/brain',
  canvas: '/workspace/canvas',
};

/**
 * Workspace / Brain / Canvas mode pills, rendered on the far right of
 * TopNav next to the battery. Switching mode swaps the left-rail nav
 * items via NAV_BY_MODE in nav-config.ts.
 */
export default function TopNavModes() {
  const pathname = usePathname();
  const router = useRouter();
  const mode = useMemo(() => modeForPath(pathname), [pathname]);
  return (
    <div
      role="tablist"
      aria-label="Modo del espacio"
      style={{
        display: 'flex',
        alignItems: 'stretch',
        height: '100%',
      }}
    >
      {SHELL_MODES.map((m, i) => {
        const active = m.id === mode;
        const isLast = i === SHELL_MODES.length - 1;
        return (
          <button
            key={m.id}
            role="tab"
            aria-selected={active}
            onClick={() => router.push(MODE_ROOT[m.id])}
            style={{
              padding: '0 0.85rem',
              background: active ? 'var(--kitz-text-strong)' : 'transparent',
              color: active ? 'var(--kitz-bg)' : 'var(--kitz-text)',
              border: 'none',
              // Only the last pill needs a right separator; the parent
              // group already supplies a left border, so no double-seams.
              borderRight: isLast ? '1px solid var(--kitz-border)' : 'none',
              cursor: 'pointer',
              fontFamily: 'var(--kitz-font-mono)',
              fontSize: '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              minWidth: '4.75rem',
              transition: 'background-color 120ms ease',
            }}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
