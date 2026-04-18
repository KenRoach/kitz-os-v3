/**
 * Top-tab modes + per-mode left-nav items for the workspace shell.
 *
 * Mirrors v2's three-tab structure:
 *   Workspace  → operational (CRM, sales, calendar, reports, settings)
 *   Brain      → AI configuration (personality, knowledge, agents, performance, logs)
 *   Canvas     → visual artifacts (gallery, templates, recents)
 */

export type ShellMode = 'workspace' | 'brain' | 'canvas';

export type NavItem = {
  href: string;
  label: string;
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
        { href: '/workspace', label: 'Dashboard' },
        { href: '/workspace/contactos', label: 'Contactos' },
        { href: '/workspace/ventas', label: 'Ventas' },
        { href: '/workspace/conversaciones', label: 'Conversaciones' },
        { href: '/workspace/calendario', label: 'Calendario' },
        { href: '/workspace/reportes', label: 'Reportes' },
      ],
    },
    {
      items: [{ href: '/workspace/ajustes', label: 'Ajustes' }],
    },
  ],
  brain: [
    {
      heading: 'Cerebro',
      items: [
        { href: '/workspace/brain', label: 'Resumen' },
        { href: '/workspace/brain/personalidad', label: 'Personalidad' },
        { href: '/workspace/brain/agentes', label: 'Agentes' },
        { href: '/workspace/brain/skills', label: 'Skills' },
        { href: '/workspace/brain/conocimiento', label: 'Conocimiento' },
        { href: '/workspace/brain/registro', label: 'Registro' },
      ],
    },
  ],
  canvas: [
    {
      items: [
        { href: '/workspace/canvas', label: 'Galería' },
        { href: '/workspace/canvas/plantillas', label: 'Plantillas' },
        { href: '/workspace/canvas/recientes', label: 'Recientes' },
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
