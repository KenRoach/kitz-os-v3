/**
 * Work-packs — bundles of starter agents organized by the JOB the user wants
 * done, not by industry vertical.
 *
 * Each pack declares which agent presets to seed for a tenant. The pack
 * choice happens during onboarding; tenants can swap or extend any time.
 */

import type { ToolId } from './tools';

export type WorkPackSlug =
  | 'general'
  | 'sales-pipeline'
  | 'appointments'
  | 'service-tickets'
  | 'inquiry-quote'
  | 'recurring-outreach';

export type AgentSeed = {
  slug: string;
  name: string;
  description: string;
  systemPrompt: string;
  defaultModel: 'haiku' | 'sonnet' | 'opus';
  defaultTools: readonly ToolId[];
};

export type WorkPack = {
  slug: WorkPackSlug;
  name: string;
  description: string;
  /** Short pitch shown on the onboarding pack picker. */
  tagline: string;
  /** Agents seeded for the tenant. First entry becomes the active agent. */
  agents: readonly AgentSeed[];
};

const KITZ_GENERAL: AgentSeed = {
  slug: 'kitz',
  name: 'Kitz',
  description: 'Asistente personal por defecto. Responde preguntas y enruta a otros agentes.',
  systemPrompt:
    'Eres Kitz, el asistente personal de KitZ. Hablas español por defecto, eres directo y útil. Usas datos reales del espacio cuando los tienes.',
  defaultModel: 'haiku',
  defaultTools: ['list_contacts', 'list_deals'],
};

export const WORK_PACKS: readonly WorkPack[] = [
  {
    slug: 'general',
    name: 'General',
    description: 'Punto de partida neutro: solo el asistente Kitz, sin enfocar el flujo.',
    tagline: 'Empieza con un asistente y agrega lo que necesites después.',
    agents: [KITZ_GENERAL],
  },
  {
    slug: 'sales-pipeline',
    name: 'Pipeline de ventas',
    description: 'B2B, inmobiliarias, autos: prospectar → calificar → cerrar.',
    tagline: 'Captura leads, califica y cierra tratos.',
    agents: [
      KITZ_GENERAL,
      {
        slug: 'sdr',
        name: 'SDR · Calificación',
        description: 'Califica prospectos entrantes y propone próximos pasos.',
        systemPrompt:
          'Eres SDR de KitZ. Calificas prospectos, identificas necesidades, y propones próximos pasos. Tono profesional cercano. Si tienes presupuesto, autoridad, necesidad o tiempo (BANT), lo confirmas.',
        defaultModel: 'sonnet',
        defaultTools: ['list_contacts', 'create_contact', 'send_whatsapp'],
      },
      {
        slug: 'ae',
        name: 'AE · Cierre',
        description: 'Cierra tratos, maneja objeciones y mantiene el pipeline limpio.',
        systemPrompt:
          'Eres Account Executive de KitZ. Cierras tratos, manejas objeciones, mantienes el pipeline limpio. Sin presión, con datos. Resumes próximos pasos al final de cada conversación.',
        defaultModel: 'sonnet',
        defaultTools: ['list_deals', 'update_deal_stage', 'send_whatsapp'],
      },
    ],
  },
  {
    slug: 'appointments',
    name: 'Citas + intake',
    description:
      'Doctores, salones, abogados, consultores: agendar, recordar, recoger info previa.',
    tagline: 'Agenda citas y recoge información antes de que lleguen.',
    agents: [
      KITZ_GENERAL,
      {
        slug: 'recepcion',
        name: 'Recepción',
        description: 'Atiende solicitudes de cita, ofrece horarios disponibles y confirma.',
        systemPrompt:
          'Eres Recepción de KitZ. Atiendes solicitudes de cita, ofreces horarios disponibles, confirmas con el cliente, y registras el contacto. Tono cálido y profesional.',
        defaultModel: 'haiku',
        defaultTools: ['list_contacts', 'create_contact', 'create_calendar_event', 'send_whatsapp'],
      },
      {
        slug: 'intake',
        name: 'Intake · Pre-cita',
        description: 'Hace preguntas previas a la cita para preparar al profesional.',
        systemPrompt:
          'Eres Intake de KitZ. Antes de cada cita, haces preguntas estructuradas para que el profesional llegue preparado. No diagnosticas ni asesoras: solo recoges información.',
        defaultModel: 'haiku',
        defaultTools: ['list_contacts', 'send_whatsapp'],
      },
    ],
  },
  {
    slug: 'service-tickets',
    name: 'Tickets de servicio',
    description: 'Talleres, reparaciones, IT, plomería: intake → estado → seguimiento.',
    tagline: 'Recibe trabajos, comunica estado y haz seguimiento al final.',
    agents: [
      KITZ_GENERAL,
      {
        slug: 'intake',
        name: 'Intake · Trabajo',
        description:
          'Recoge detalles del trabajo (qué falla, cuándo lo necesita, datos del cliente).',
        systemPrompt:
          'Eres Intake de KitZ para servicios. Recoges detalles claros del trabajo: descripción, urgencia, datos del cliente. No prometes precios ni tiempos sin información del técnico.',
        defaultModel: 'haiku',
        defaultTools: ['list_contacts', 'create_contact', 'send_whatsapp'],
      },
      {
        slug: 'estado',
        name: 'Estado · Updates',
        description: 'Notifica avances y cambios de estado al cliente.',
        systemPrompt:
          'Eres Estado de KitZ. Comunicas avances al cliente con claridad y honestidad. Si hay demora, lo dices con un nuevo estimado.',
        defaultModel: 'haiku',
        defaultTools: ['list_contacts', 'send_whatsapp'],
      },
      {
        slug: 'seguimiento',
        name: 'Seguimiento · Post-servicio',
        description: 'Confirma satisfacción y abre la puerta a próximos servicios.',
        systemPrompt:
          'Eres Seguimiento de KitZ. Días después del servicio confirmas que todo bien, pides retroalimentación breve y mencionas servicios complementarios solo si son pertinentes.',
        defaultModel: 'haiku',
        defaultTools: ['list_contacts', 'send_whatsapp'],
      },
    ],
  },
  {
    slug: 'inquiry-quote',
    name: 'Inquiry → cotización',
    description: 'Catering, eventos, builds custom: calificar → cotizar → cerrar.',
    tagline: 'Convierte solicitudes en cotizaciones cerradas.',
    agents: [
      KITZ_GENERAL,
      {
        slug: 'qualifier',
        name: 'Qualifier',
        description: 'Entiende qué pide el cliente para preparar una cotización útil.',
        systemPrompt:
          'Eres Qualifier de KitZ. Antes de cotizar, recoges los detalles que faltan: cantidad, fecha, lugar, restricciones, presupuesto aproximado. Sin presión.',
        defaultModel: 'haiku',
        defaultTools: ['list_contacts', 'create_contact', 'send_whatsapp'],
      },
      {
        slug: 'closer',
        name: 'Closer · Cotización',
        description: 'Hace seguimiento a cotizaciones enviadas y resuelve dudas.',
        systemPrompt:
          'Eres Closer de KitZ. Tras enviar cotización, haces seguimiento, resuelves dudas, y propones cierre. No bajas precio sin razón estructurada.',
        defaultModel: 'sonnet',
        defaultTools: ['list_deals', 'update_deal_stage', 'send_whatsapp'],
      },
    ],
  },
  {
    slug: 'recurring-outreach',
    name: 'Outreach recurrente',
    description: 'Newsletters, campañas drip, reactivación de clientes inactivos.',
    tagline: 'Mantén comunicación regular con tu base sin sonar a robot.',
    agents: [
      KITZ_GENERAL,
      {
        slug: 'composer',
        name: 'Composer · Mensaje',
        description: 'Redacta mensajes adaptados al contexto del contacto.',
        systemPrompt:
          'Eres Composer de KitZ. Redactas mensajes cortos, personales, y útiles. Sin ofertas agresivas. Usas el historial del contacto si lo tienes.',
        defaultModel: 'sonnet',
        defaultTools: ['list_contacts', 'send_whatsapp'],
      },
      {
        slug: 'audience',
        name: 'Audience · Segmentación',
        description: 'Sugiere a qué grupo de contactos enviar cada mensaje.',
        systemPrompt:
          'Eres Audience de KitZ. Sugieres a qué grupo enviar cada mensaje según etiquetas, última interacción, y comportamiento previo. Explicas por qué.',
        defaultModel: 'haiku',
        defaultTools: ['list_contacts'],
      },
    ],
  },
];

export const WORK_PACK_SLUGS = WORK_PACKS.map((p) => p.slug);

export function getWorkPack(slug: string): WorkPack | undefined {
  return WORK_PACKS.find((p) => p.slug === slug);
}
