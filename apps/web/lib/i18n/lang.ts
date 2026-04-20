/**
 * Active language — single source of truth across the app.
 *
 * Drives:
 *   - UI language (Spanish / English / Portuguese)
 *   - ElevenLabs voiceId selection (each Voice persona has a per-locale
 *     voiceId so PT picks a Portuguese-native voice automatically)
 *   - Web Speech recognition `lang` param so STT understands the right
 *     language when the user dictates
 *   - SpeechSynthesis fallback `lang` for the browser TTS path
 *
 * Persisted per-tenant in localStorage under `kitz-lang:<slug>` so the
 * choice survives reloads and is scoped to the workspace.
 *
 * The legacy global `kitz-lang` key (no tenant suffix) is read as a
 * fallback so older sessions don't lose their pick on first load.
 */

export const LANGS = ['es', 'en', 'pt'] as const;
export type LangId = (typeof LANGS)[number];

export const LANG_LABELS: Record<LangId, string> = {
  es: 'ES',
  en: 'EN',
  pt: 'PT',
};

export const LANG_NAMES: Record<LangId, string> = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
};

/** BCP-47 codes used by Web Speech API + ElevenLabs hints. */
export const LANG_BCP47: Record<LangId, string> = {
  es: 'es-PA',
  en: 'en-US',
  pt: 'pt-BR',
};

export const DEFAULT_LANG: LangId = 'es';

const STORAGE_PREFIX = 'kitz-lang';
const LEGACY_KEY = 'kitz-lang'; // pre-tenant version

function isLang(v: unknown): v is LangId {
  return typeof v === 'string' && (LANGS as readonly string[]).includes(v);
}

/**
 * Load the active language for a tenant. Falls back to legacy global
 * key, then DEFAULT_LANG. Safe to call from SSR (returns DEFAULT_LANG).
 */
export function loadLang(tenantSlug: string): LangId {
  if (typeof window === 'undefined') return DEFAULT_LANG;
  const scoped = window.localStorage.getItem(`${STORAGE_PREFIX}:${tenantSlug}`);
  if (isLang(scoped)) return scoped;
  const legacy = window.localStorage.getItem(LEGACY_KEY);
  if (isLang(legacy)) return legacy;
  return DEFAULT_LANG;
}

export function saveLang(tenantSlug: string, lang: LangId): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${STORAGE_PREFIX}:${tenantSlug}`, lang);
  // Mirror to legacy key so any pre-tenant reader sees the new value.
  window.localStorage.setItem(LEGACY_KEY, lang);
  // Tell other components in the tab to re-read.
  window.dispatchEvent(new CustomEvent('kitz-lang-change', { detail: { lang, tenantSlug } }));
}

/** Ergonomic helper for components that just want the current code. */
export function bcp47(lang: LangId): string {
  return LANG_BCP47[lang];
}
