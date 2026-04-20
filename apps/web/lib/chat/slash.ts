/**
 * Slash command registry — typed actions the chat input invokes when
 * the user types a `/command` and selects from the typeahead.
 *
 * Each command declares an `action` the chat UI dispatches:
 *   - 'navigate'     -> Link to an existing page
 *   - 'inline-form'  -> Render a small inline form (cotización draft, event creator, contact create)
 *   - 'send'         -> Send a pre-filled message to Kitz with the rest of the line
 *   - 'export'       -> Trigger conversation export
 *   - 'clear'        -> Clear the local conversation
 *
 * The chat shell decides what to render per action. This keeps the
 * registry pure data so both desktop and mobile can share it.
 */

export type SlashAction =
  | { type: 'navigate'; href: string }
  | { type: 'inline-form'; form: 'quote' | 'event' | 'contact' }
  | { type: 'send'; template: string }
  | { type: 'image-prompt' }
  | { type: 'export' }
  | { type: 'clear' };

export type SlashCommand = {
  id: string;
  /** Without the leading slash. */
  trigger: string;
  /** Spanish aliases that also match. */
  aliases: string[];
  label: string;
  description: string;
  /** Single-glyph icon for the typeahead row. */
  glyph: string;
  action: SlashAction;
};

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'cotizar',
    trigger: 'cotizar',
    aliases: ['quote', 'cotizacion', 'cotización'],
    label: '/cotizar',
    description: 'Crear una cotización inline',
    glyph: '⌘',
    action: { type: 'inline-form', form: 'quote' },
  },
  {
    id: 'cita',
    trigger: 'cita',
    aliases: ['evento', 'event', 'agenda'],
    label: '/cita',
    description: 'Agendar un evento en tu calendario',
    glyph: '◷',
    action: { type: 'inline-form', form: 'event' },
  },
  {
    id: 'contacto',
    trigger: 'contacto',
    aliases: ['contact', 'cliente'],
    label: '/contacto',
    description: 'Crear un nuevo contacto',
    glyph: '◉',
    action: { type: 'inline-form', form: 'contact' },
  },
  {
    id: 'buscar',
    trigger: 'buscar',
    aliases: ['search', 'find'],
    label: '/buscar',
    description: 'Buscar contactos, tratos o documentos',
    glyph: '⌕',
    action: { type: 'send', template: 'Buscar:' },
  },
  {
    id: 'imagen',
    trigger: 'imagen',
    aliases: ['image', 'img', 'generar'],
    label: '/imagen',
    description: 'Generar una imagen con IA (OpenAI)',
    glyph: '◧',
    action: { type: 'image-prompt' },
  },
  {
    id: 'resumen',
    trigger: 'resumen',
    aliases: ['summary', 'resumir'],
    label: '/resumen',
    description: 'Resume la conversación hasta acá',
    glyph: '☰',
    action: { type: 'send', template: 'Resume nuestra conversación hasta acá en 3-5 puntos.' },
  },
  {
    id: 'exportar',
    trigger: 'exportar',
    aliases: ['export', 'descargar'],
    label: '/exportar',
    description: 'Descargar la conversación como Markdown',
    glyph: '↓',
    action: { type: 'export' },
  },
  {
    id: 'limpiar',
    trigger: 'limpiar',
    aliases: ['clear', 'reset', 'borrar'],
    label: '/limpiar',
    description: 'Vaciar el chat (no se borran datos del workspace)',
    glyph: '⊘',
    action: { type: 'clear' },
  },
];

/**
 * Parse a chat input string. Returns the matched command + the rest of
 * the line if the input starts with a known slash trigger; null otherwise.
 */
export function parseSlash(input: string): { command: SlashCommand; rest: string } | null {
  const trimmed = input.trimStart();
  if (!trimmed.startsWith('/')) return null;
  const space = trimmed.indexOf(' ');
  const trigger = (space === -1 ? trimmed.slice(1) : trimmed.slice(1, space)).toLowerCase();
  const rest = space === -1 ? '' : trimmed.slice(space + 1).trim();
  const cmd = SLASH_COMMANDS.find(
    (c) => c.trigger === trigger || c.aliases.includes(trigger),
  );
  return cmd ? { command: cmd, rest } : null;
}

/**
 * Filter the registry by a typeahead query (everything after `/`).
 * Returns sorted by match strength: exact prefix > alias prefix > contains.
 */
export function filterSlash(query: string): SlashCommand[] {
  const q = query.toLowerCase();
  if (!q) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter(
    (c) =>
      c.trigger.startsWith(q) ||
      c.aliases.some((a) => a.startsWith(q)) ||
      c.description.toLowerCase().includes(q),
  ).sort((a, b) => {
    const aw = a.trigger.startsWith(q) ? 0 : a.aliases.some((al) => al.startsWith(q)) ? 1 : 2;
    const bw = b.trigger.startsWith(q) ? 0 : b.aliases.some((al) => al.startsWith(q)) ? 1 : 2;
    return aw - bw;
  });
}
