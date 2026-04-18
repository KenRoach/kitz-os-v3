import TopNavSearch from './top-nav-search';
import TopNavBattery from './top-nav-battery';
import TopNavFullscreen from './top-nav-fullscreen';

type Props = {
  tenantName: string;
  credits: number;
  lifetimeTopup: number;
};

/**
 * Full-width top chrome rendered above the 3-column shell.
 * Brand left · global search center · battery right.
 * Workspace/Brain/Canvas mode tabs live in the left rail (ShellNav), not here.
 */
export default function TopNav({ tenantName, credits, lifetimeTopup }: Props) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'stretch',
        height: '2.75rem',
        flexShrink: 0,
        borderBottom: '1px solid var(--kitz-border)',
        background: 'var(--kitz-bg)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 1rem',
          gap: '0.75rem',
          borderRight: '1px solid var(--kitz-border)',
          minWidth: '18rem',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '1.5rem',
            height: '1.5rem',
            border: '1px solid var(--kitz-border)',
            color: 'var(--kitz-text-strong)',
            fontWeight: 700,
            fontSize: '0.75rem',
          }}
          aria-hidden
        >
          K
        </span>
        <span
          style={{
            color: 'var(--kitz-text-strong)',
            fontWeight: 600,
            fontSize: '0.875rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            letterSpacing: '0.01em',
          }}
          title={`KitZ · ${tenantName}`}
        >
          KitZ
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 1rem' }}>
        <TopNavSearch />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
        }}
      >
        <TopNavFullscreen />
        <TopNavBattery credits={credits} lifetimeTopup={lifetimeTopup} />
      </div>
    </header>
  );
}
