/**
 * Top-tab modes + per-mode left-nav items for the workspace shell.
 *
 * Mirrors v2's three-tab structure:
 *   Workspace  → operational (CRM, sales, calendar, reports, settings)
 *   Brain      → AI configuration (personality, knowledge, agents, performance, logs)
 *   Canvas     → visual artifacts (gallery, templates, recents)
 */

export type ShellMode = 'workspace' | 'brain' | 'canvas';

export type NavIcon =
  | 'home'
  | 'users'
  | 'sales'
  | 'chat'
  | 'calendar'
  | 'report'
  | 'settings'
  | 'brain'
  | 'persona'
  | 'agent'
  | 'skill'
  | 'book'
  | 'log'
  | 'gallery'
  | 'template'
  | 'clock'
  | 'invoice';

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
};

export type NavSection = {
  heading?: string;
  items: NavItem[];
};

export const SHELL_MODES: { id: ShellMode; label: string }[] = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'brain', label: 'Brain' },
  { id: 'canvas', label: 'Canvas' },
];

export const NAV_BY_MODE: Record<ShellMode, NavSection[]> = {
  workspace: [
    {
      items: [
        { href: '/workspace', label: 'Dashboard', icon: 'home' },
        { href: '/workspace/contactos', label: 'Contactos', icon: 'users' },
        { href: '/workspace/ventas', label: 'Ventas', icon: 'sales' },
        { href: '/workspace/conversaciones', label: 'Conversaciones', icon: 'chat' },
        { href: '/workspace/calendario', label: 'Calendario', icon: 'calendar' },
        { href: '/workspace/cotizaciones', label: 'Cotizaciones', icon: 'invoice' },
        { href: '/workspace/reportes', label: 'Reportes', icon: 'report' },
      ],
    },
  ],
  brain: [
    {
      heading: 'Cerebro',
      items: [
        { href: '/workspace/brain', label: 'Resumen', icon: 'brain' },
        { href: '/workspace/brain/personalidad', label: 'Personalidad', icon: 'persona' },
        { href: '/workspace/brain/agentes', label: 'Agentes', icon: 'agent' },
        { href: '/workspace/brain/skills', label: 'Skills', icon: 'skill' },
        { href: '/workspace/brain/conocimiento', label: 'Conocimiento', icon: 'book' },
        { href: '/workspace/brain/registro', label: 'Registro', icon: 'log' },
      ],
    },
  ],
  canvas: [
    {
      items: [
        { href: '/workspace/canvas', label: 'Galería', icon: 'gallery' },
        { href: '/workspace/canvas/plantillas', label: 'Plantillas', icon: 'template' },
        { href: '/workspace/canvas/recientes', label: 'Recientes', icon: 'clock' },
      ],
    },
  ],
};

/**
 * Infer the active shell mode from a pathname. Falls back to workspace.
 */
export function modeForPath(pathname: string): ShellMode {
  if (pathname.startsWith('/workspace/brain')) return 'brain';
  if (pathname.startsWith('/workspace/canvas')) return 'canvas';
  return 'workspace';
}

/**
 * Match active link by deepest prefix in the active mode's items.
 * Exact-match for top-level mode roots so "/workspace" doesn't claim
 * "/workspace/contactos".
 */
export function isActive(pathname: string, href: string): boolean {
  if (href === pathname) return true;
  // Mode root pages must match exactly.
  if (href === '/workspace' || href === '/workspace/brain' || href === '/workspace/canvas') {
    return false;
  }
  return pathname.startsWith(`${href}/`);
}
