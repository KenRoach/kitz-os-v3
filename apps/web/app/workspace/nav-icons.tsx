import type { NavIcon } from './nav-config';

type Props = {
  icon: NavIcon;
  size?: number;
  strokeWidth?: number;
};

const baseProps = (size: number, strokeWidth: number) =>
  ({
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }) as const;

/**
 * Single render-from-key SVG icon set. Strokes match the terminal aesthetic
 * (1.6px, monochrome, rounded ends). Matches the chat-attachment icon style.
 */
export default function NavIcon({ icon, size = 16, strokeWidth = 1.6 }: Props) {
  const props = baseProps(size, strokeWidth);

  switch (icon) {
    case 'home':
      return (
        <svg {...props}>
          <path d="M3 11l9-8 9 8" />
          <path d="M5 10v10h14V10" />
          <path d="M10 20v-6h4v6" />
        </svg>
      );
    case 'users':
      return (
        <svg {...props}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20a6.5 6.5 0 0113 0" />
          <path d="M16 11a3 3 0 100-6" />
          <path d="M22 19a5 5 0 00-5-5" />
        </svg>
      );
    case 'sales':
      return (
        <svg {...props}>
          <path d="M3 17l5-5 4 4 8-8" />
          <polyline points="14 8 20 8 20 14" />
        </svg>
      );
    case 'chat':
      return (
        <svg {...props}>
          <path d="M4 5h16v11H8l-4 4z" />
          <line x1="8" y1="10" x2="16" y2="10" />
          <line x1="8" y1="13" x2="13" y2="13" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...props}>
          <rect x="3" y="5" width="18" height="16" rx="1" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <line x1="8" y1="3" x2="8" y2="7" />
          <line x1="16" y1="3" x2="16" y2="7" />
        </svg>
      );
    case 'report':
      return (
        <svg {...props}>
          <line x1="4" y1="20" x2="20" y2="20" />
          <rect x="6" y="12" width="3" height="8" />
          <rect x="11" y="7" width="3" height="13" />
          <rect x="16" y="14" width="3" height="6" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 00.34 1.85l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.85-.34 1.7 1.7 0 00-1 1.55V21a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1-1.55 1.7 1.7 0 00-1.85.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.85 1.7 1.7 0 00-1.55-1H3a2 2 0 110-4h.09a1.7 1.7 0 001.55-1 1.7 1.7 0 00-.34-1.85l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.85.34h.01a1.7 1.7 0 001-1.55V3a2 2 0 114 0v.09a1.7 1.7 0 001 1.55 1.7 1.7 0 001.85-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.85v.01a1.7 1.7 0 001.55 1H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.55 1z" />
        </svg>
      );
    case 'brain':
      return (
        <svg {...props}>
          <path d="M9.5 4a3 3 0 00-3 3v.2A3 3 0 003 10v1a3 3 0 001.5 2.6V14a3 3 0 003 3 3 3 0 003 3h0V4z" />
          <path d="M14.5 4a3 3 0 013 3v.2A3 3 0 0121 10v1a3 3 0 01-1.5 2.6V14a3 3 0 01-3 3 3 3 0 01-3 3h0V4z" />
        </svg>
      );
    case 'persona':
      return (
        <svg {...props}>
          <circle cx="12" cy="9" r="3.5" />
          <path d="M5 21a7 7 0 0114 0" />
        </svg>
      );
    case 'agent':
      return (
        <svg {...props}>
          <rect x="5" y="7" width="14" height="12" rx="1" />
          <line x1="12" y1="3" x2="12" y2="7" />
          <circle cx="12" cy="3" r="1" />
          <circle cx="9" cy="13" r="1" />
          <circle cx="15" cy="13" r="1" />
          <line x1="9" y1="17" x2="15" y2="17" />
        </svg>
      );
    case 'skill':
      return (
        <svg {...props}>
          <path d="M12 2l2.5 6 6.5.5-5 4.5 1.5 6.5L12 16l-5.5 3.5L8 13 3 8.5 9.5 8z" />
        </svg>
      );
    case 'book':
      return (
        <svg {...props}>
          <path d="M4 5a2 2 0 012-2h13v17H6a2 2 0 00-2 2V5z" />
          <line x1="4" y1="20" x2="19" y2="20" />
        </svg>
      );
    case 'log':
      return (
        <svg {...props}>
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="14" y2="18" />
        </svg>
      );
    case 'gallery':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="18" height="18" rx="1" />
          <circle cx="9" cy="9" r="1.6" />
          <path d="M21 16l-5-5-9 9" />
        </svg>
      );
    case 'template':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="18" height="18" rx="1" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="9" x2="9" y2="21" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 16 14" />
        </svg>
      );
    case 'invoice':
      return (
        <svg {...props}>
          <path d="M6 3h10l4 4v14H6z" />
          <polyline points="16 3 16 7 20 7" />
          <line x1="9" y1="12" x2="17" y2="12" />
          <line x1="9" y1="16" x2="14" y2="16" />
        </svg>
      );
    default:
      return null;
  }
}
