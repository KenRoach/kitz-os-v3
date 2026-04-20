/**
 * Curated catalogue of 3 ElevenLabs voice personas KitZ ships with.
 *
 * Each persona (Rachel / José / Sarah) maps to a different actual
 * ElevenLabs voiceId per language so PT picks a Portuguese-native
 * voice automatically when the user switches language. The persona
 * identity stays consistent across locales — Rachel is always the
 * professional female, José is always the warm male, Sarah is always
 * the energetic female — but the underlying voice changes so the
 * accent matches the active language.
 *
 * Voice ids reference the public ElevenLabs library. The multilingual
 * v2 model already speaks all three languages well from a single
 * voiceId, so the per-language map currently uses the same id; the
 * structure is in place for when you want truly native voices per
 * locale (e.g. a Brazilian-accent José for PT users).
 *
 * Persisted per-tenant in localStorage under `kitz-voice:<slug>`.
 */

import { type LangId, loadLang } from '@/lib/i18n/lang';

export type VoiceId = 'rachel' | 'jose' | 'sarah';

export type Voice = {
  id: VoiceId;
  label: string;
  description: string;
  /** Glyph for the chip / radio. */
  glyph: string;
  /** ElevenLabs voiceId per language. Multilingual model = same id today,
   *  but split per LangId so we can swap in language-native voices later. */
  byLang: Record<LangId, string>;
  /** Preview sample per language so the picker can show something the
   *  user actually understands when they hit "Probar". */
  samples: Record<LangId, string>;
};

export const VOICES: Voice[] = [
  {
    id: 'rachel',
    label: 'Rachel',
    description: 'Femenina · neutral · profesional. Default.',
    glyph: '◆',
    byLang: {
      es: '21m00Tcm4TlvDq8ikWAM',
      en: '21m00Tcm4TlvDq8ikWAM',
      pt: '21m00Tcm4TlvDq8ikWAM',
    },
    samples: {
      es: 'Hola, soy KitZ. Tienes tres eventos en tu calendario hoy.',
      en: "Hi, I'm KitZ. You have three events on your calendar today.",
      pt: 'Olá, sou KitZ. Você tem três eventos na sua agenda hoje.',
    },
  },
  {
    id: 'jose',
    label: 'José',
    description: 'Masculina · cálida · cercana.',
    glyph: '✿',
    byLang: {
      es: 'pNInz6obpgDQGcFmaJgB',
      en: 'pNInz6obpgDQGcFmaJgB',
      pt: 'pNInz6obpgDQGcFmaJgB',
    },
    samples: {
      es: 'Listo. Te acabo de generar la cotización para Jaime Madrid.',
      en: 'Done. I just generated the quote for Jaime Madrid.',
      pt: 'Pronto. Acabei de gerar o orçamento para o Jaime Madrid.',
    },
  },
  {
    id: 'sarah',
    label: 'Sarah',
    description: 'Femenina · enérgica · directa.',
    glyph: '→',
    byLang: {
      es: 'EXAVITQu4vr4xnSDxMaL',
      en: 'EXAVITQu4vr4xnSDxMaL',
      pt: 'EXAVITQu4vr4xnSDxMaL',
    },
    samples: {
      es: 'Tienes dos facturas vencidas. Te las priorizo en tareas.',
      en: 'You have two overdue invoices. I prioritised them in tasks.',
      pt: 'Você tem duas faturas vencidas. Já priorizei nas tarefas.',
    },
  },
];

export const DEFAULT_VOICE: VoiceId = 'rachel';

const STORAGE_PREFIX = 'kitz-voice';

export function loadVoice(tenantSlug: string): VoiceId {
  if (typeof window === 'undefined') return DEFAULT_VOICE;
  const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${tenantSlug}`);
  if (raw && VOICES.some((v) => v.id === raw)) return raw as VoiceId;
  return DEFAULT_VOICE;
}

export function saveVoice(tenantSlug: string, voice: VoiceId): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${STORAGE_PREFIX}:${tenantSlug}`, voice);
}

export function getVoice(id: VoiceId): Voice {
  return VOICES.find((v) => v.id === id) ?? VOICES[0]!;
}

/**
 * Look up the ElevenLabs voiceId for the tenant's active persona AND
 * active language. Both are persisted per-tenant in localStorage so
 * this is a pure read.
 */
export function getElevenIdForTenant(tenantSlug: string): string {
  const lang = loadLang(tenantSlug);
  const voice = getVoice(loadVoice(tenantSlug));
  return voice.byLang[lang];
}

/** Preview sample for the current language. */
export function sampleFor(id: VoiceId, lang: LangId): string {
  return getVoice(id).samples[lang];
}
