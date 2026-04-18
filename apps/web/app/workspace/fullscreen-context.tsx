'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

type FullscreenCtx = {
  fullscreen: boolean;
  toggle: () => void;
  setFullscreen: (v: boolean) => void;
};

const Ctx = createContext<FullscreenCtx | null>(null);

const STORAGE_KEY = 'kitz-fullscreen';

export function FullscreenProvider({ children }: { children: ReactNode }) {
  const [fullscreen, setFullscreenState] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(STORAGE_KEY) === '1') {
      setFullscreenState(true);
    }
  }, []);

  const setFullscreen = useCallback((v: boolean) => {
    setFullscreenState(v);
    if (typeof window === 'undefined') return;
    if (v) window.localStorage.setItem(STORAGE_KEY, '1');
    else window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const toggle = useCallback(() => {
    setFullscreen(!fullscreen);
  }, [fullscreen, setFullscreen]);

  return <Ctx.Provider value={{ fullscreen, toggle, setFullscreen }}>{children}</Ctx.Provider>;
}

/**
 * Returns the fullscreen toggle state. Components that render outside the
 * provider (e.g. the login page) get a safe default where fullscreen is
 * always false and toggle is a no-op.
 */
export function useFullscreen(): FullscreenCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      fullscreen: false,
      toggle: () => undefined,
      setFullscreen: () => undefined,
    };
  }
  return ctx;
}
