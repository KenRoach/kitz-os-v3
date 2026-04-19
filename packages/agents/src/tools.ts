/**
 * Tool registry for KitZ agents.
 *
 * Each tool declares a scope so the agent runner knows whether the call:
 *  - read_only: returns data, never mutates (always allowed)
 *  - draft:     proposes a change, requires user approval before execution
 *  - execute:   directly mutates tenant data (allowed only when explicitly granted)
 *  - webhook:   hits an external system (rate-limited, audited)
 */
export const TOOL_SCOPES = ['read_only', 'draft', 'execute', 'webhook'] as const;
export type ToolScope = (typeof TOOL_SCOPES)[number];

export const TOOL_CATEGORIES = ['crm', 'sales', 'comms', 'calendar', 'system', 'feedback'] as const;
export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

export type ToolDef = {
  id: string;
  name: string;
  description: string;
  scope: ToolScope;
  category: ToolCategory;
};

export const TOOLS: readonly ToolDef[] = [
  {
    id: 'list_contacts',
    name: 'Listar contactos',
    description: 'Devuelve los contactos del espacio con filtros opcionales.',
    scope: 'read_only',
    category: 'crm',
  },
  {
    id: 'create_contact',
    name: 'Crear contacto',
    description: 'Agrega un nuevo contacto al CRM.',
    scope: 'execute',
    category: 'crm',
  },
  {
    id: 'list_deals',
    name: 'Listar tratos',
    description: 'Devuelve el pipeline de ventas por etapa.',
    scope: 'read_only',
    category: 'sales',
  },
  {
    id: 'update_deal_stage',
    name: 'Mover trato',
    description: 'Cambia la etapa de un trato existente.',
    scope: 'execute',
    category: 'sales',
  },
  {
    id: 'send_whatsapp',
    name: 'Enviar WhatsApp',
    description: 'Envía un mensaje. Por defecto crea un borrador para aprobar.',
    scope: 'draft',
    category: 'comms',
  },
  {
    id: 'create_calendar_event',
    name: 'Crear evento',
    description: 'Crea un evento en el calendario del usuario.',
    scope: 'execute',
    category: 'calendar',
  },
  {
    id: 'capture_feedback',
    name: 'Registrar feedback',
    description:
      'Registra un bug, solicitud de funcionalidad o queja del usuario. Siempre úsalo cuando el usuario reporte un problema con KitZ.',
    scope: 'execute',
    category: 'feedback',
  },
] as const;

export const TOOL_IDS = TOOLS.map((t) => t.id);
export type ToolId = (typeof TOOLS)[number]['id'];

export function getToolById(id: string): ToolDef | undefined {
  return TOOLS.find((t) => t.id === id);
}

export function getToolsByIds(ids: readonly string[]): ToolDef[] {
  const set = new Set(ids);
  return TOOLS.filter((t) => set.has(t.id));
}

/**
 * Returns the subset of `requested` tool IDs that the agent is permitted to use.
 * Unknown ids are dropped silently. Callers can compare lengths to detect drift.
 */
export function filterAllowedTools(
  requested: readonly string[],
  allowed: readonly string[],
): ToolDef[] {
  const allowSet = new Set(allowed);
  return TOOLS.filter((t) => allowSet.has(t.id) && requested.includes(t.id));
}
