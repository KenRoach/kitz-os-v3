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
 * Workspace / Brain / Canvas mode pills, rendered inside TopNav.
 * Replaces the old left-rail mode tabs now that the left rail is the chat.
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
      {SHELL_MODES.map((m) => {
        const active = m.id === mode;
        return (
          <button
            key={m.id}
            role="tab"
            aria-selected={active}
            onClick={() => router.push(MODE_ROOT[m.id])}
            style={{
              padding: '0 0.75rem',
              background: active ? 'var(--kitz-text-strong)' : 'transparent',
              color: active ? 'var(--kitz-bg)' : 'var(--kitz-text)',
              border: 'none',
              borderRight: '1px solid var(--kitz-border)',
              cursor: 'pointer',
              fontFamily: 'var(--kitz-font-mono)',
              fontSize: '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              minWidth: '4.5rem',
            }}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
