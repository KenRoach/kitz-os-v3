/**
 * Vibes — switchable personality/mood prefixes for the active agent.
 *
 * Each vibe ships a system-prompt prefix that gets prepended to the
 * existing agent's saved system_prompt at request time. The persisted
 * agent personality stays untouched — the vibe is a per-conversation
 * tone overlay, not a write to the agents store.
 *
 * Persisted per-tenant via localStorage key `kitz-vibe:<slug>` so the
 * choice survives reloads and is scoped to the workspace.
 */

export type VibeId =
  | 'profesional'
  | 'directo'
  | 'calido'
  | 'tecnico'
  | 'brutal'
  | 'creativo';

export type Vibe = {
  id: VibeId;
  label: string;
  description: string;
  /** Single-emoji-or-symbol marker for the chip. Mono-friendly. */
  glyph: string;
  /** System-prompt prefix. Concatenated before the agent's persona. */
  prefix: string;
};

export const VIBES: Vibe[] = [
  {
    id: 'profesional',
    label: 'Profesional',
    description: 'Tono ejecutivo, claro y respetuoso. Default.',
    glyph: '◆',
    prefix:
      'Tono profesional, claro y conciso. Evita jerga corporativa. Responde en español rioplatense neutro.',
  },
  {
    id: 'directo',
    label: 'Directo',
    description: 'Sin preámbulos. Va al grano.',
    glyph: '→',
    prefix:
      'Tono directo y sin preámbulos. Cero filler. Una frase de respuesta cuando alcance. Sin saludos.',
  },
  {
    id: 'calido',
    label: 'Cálido',
    description: 'Cercano, cordial, humano.',
    glyph: '✿',
    prefix:
      'Tono cálido y cercano, como un colega de confianza. Usa la primera persona del plural cuando ayude. Empatía sin exagerar.',
  },
  {
    id: 'tecnico',
    label: 'Técnico',
    description: 'Máxima precisión, define términos.',
    glyph: '⌬',
    prefix:
      'Tono técnico y preciso. Define los términos cuando los introduzcas. Cita números y unidades. Estructura las respuestas con listas o tablas si ayuda.',
  },
  {
    id: 'brutal',
    label: 'Brutal',
    description: 'Honesto sin filtros, directo al riesgo.',
    glyph: '✕',
    prefix:
      'Tono brutalmente honesto. Si algo está mal, decilo. Señala riesgos primero, soluciones después. Evita matizar para no ofender.',
  },
  {
    id: 'creativo',
    label: 'Creativo',
    description: 'Propone alternativas inesperadas.',
    glyph: '✦',
    prefix:
      'Tono creativo y exploratorio. Propone 2-3 alternativas distintas antes de cerrar. Invita a romper supuestos.',
  },
];

export const DEFAULT_VIBE: VibeId = 'profesional';

const STORAGE_PREFIX = 'kitz-vibe';

export function loadVibe(tenantSlug: string): VibeId {
  if (typeof window === 'undefined') return DEFAULT_VIBE;
  const raw = window.localStorage.getItem(`${STORAGE_PREFIX}:${tenantSlug}`);
  if (raw && VIBES.some((v) => v.id === raw)) return raw as VibeId;
  return DEFAULT_VIBE;
}

export function saveVibe(tenantSlug: string, vibe: VibeId): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${STORAGE_PREFIX}:${tenantSlug}`, vibe);
}

export function getVibe(id: VibeId): Vibe {
  return VIBES.find((v) => v.id === id) ?? VIBES[0]!;
}
