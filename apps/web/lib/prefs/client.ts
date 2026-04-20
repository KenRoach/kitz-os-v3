'use client';

/**
 * Client bridge for user preferences — keeps localStorage as a warm
 * cache while treating the server as source of truth.
 *
 * The existing vibes / voices / lang modules already read + write
 * localStorage synchronously (that's important for SSR-safe first
 * render). Rather than rewrite their surface, this module layers on
 * top:
 *
 *   1. `pullPrefs(tenantSlug)` — GET /api/prefs, if server returns a
 *      value that differs from localStorage, mirror it in. Fires
 *      the same `kitz-lang-change` / `kitz-vibe-change` events the
 *      legacy writers do so existing UI re-reads automatically.
 *
 *   2. `pushPref(kind, value)` — POST /api/prefs so the other device
 *      gets the change. Callers should still write localStorage
 *      themselves (the individual modules do that already); this
 *      just replicates upward.
 *
 * That keeps the sync opt-in per-feature — nothing breaks if the
 * server isn't reachable; the app just falls back to per-device
 * preferences like before.
 */

import { DEFAULT_LANG, LANGS, type LangId } from '@/lib/i18n/lang';

type PrefsPayload = Partial<{ vibe: string; voice: string; lang: string }>;

const LANG_STORAGE_PREFIX = 'kitz-lang';
const LEGACY_LANG_KEY = 'kitz-lang';
const VIBE_STORAGE_PREFIX = 'kitz-vibe';
const VOICE_STORAGE_PREFIX = 'kitz-voice';

function isLang(v: string | undefined): v is LangId {
  return !!v && (LANGS as readonly string[]).includes(v);
}

export async function pullPrefs(tenantSlug: string): Promise<void> {
  if (typeof window === 'undefined') return;
  let payload: PrefsPayload | null = null;
  try {
    const r = await fetch('/api/prefs', { cache: 'no-store' });
    const j = (await r.json()) as { data: PrefsPayload | null };
    payload = j.data;
  } catch {
    return;
  }
  if (!payload) return;

  // Language — mirror into both scoped + legacy keys to match saveLang().
  if (isLang(payload.lang)) {
    const existing = window.localStorage.getItem(`${LANG_STORAGE_PREFIX}:${tenantSlug}`);
    if (existing !== payload.lang) {
      window.localStorage.setItem(`${LANG_STORAGE_PREFIX}:${tenantSlug}`, payload.lang);
      window.localStorage.setItem(LEGACY_LANG_KEY, payload.lang);
      window.dispatchEvent(
        new CustomEvent('kitz-lang-change', {
          detail: { lang: payload.lang, tenantSlug },
        }),
      );
    }
  }

  if (payload.vibe) {
    const existing = window.localStorage.getItem(`${VIBE_STORAGE_PREFIX}:${tenantSlug}`);
    if (existing !== payload.vibe) {
      window.localStorage.setItem(`${VIBE_STORAGE_PREFIX}:${tenantSlug}`, payload.vibe);
      window.dispatchEvent(
        new CustomEvent('kitz-vibe-change', {
          detail: { vibe: payload.vibe, tenantSlug },
        }),
      );
    }
  }

  if (payload.voice) {
    const existing = window.localStorage.getItem(`${VOICE_STORAGE_PREFIX}:${tenantSlug}`);
    if (existing !== payload.voice) {
      window.localStorage.setItem(`${VOICE_STORAGE_PREFIX}:${tenantSlug}`, payload.voice);
      window.dispatchEvent(
        new CustomEvent('kitz-voice-change', {
          detail: { voice: payload.voice, tenantSlug },
        }),
      );
    }
  }

  // Touch the default import so tree-shakers don't drop it — we reference
  // it indirectly via LANGS + DEFAULT_LANG to keep the typechecker happy
  // when this module is imported in isolation.
  void DEFAULT_LANG;
}

export async function pushPref(
  kind: 'vibe' | 'voice' | 'lang',
  value: string,
  fromDevice: 'desktop' | 'mobile' = 'desktop',
): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/prefs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, value, fromDevice }),
    });
  } catch {
    // Offline / server unreachable. localStorage already has the value
    // so the current device keeps working; next successful pushPref
    // (or pullPrefs from the other device) will resolve drift.
  }
}
