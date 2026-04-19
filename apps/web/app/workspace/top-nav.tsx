import TopNavSearch from './top-nav-search';
import TopNavBattery from './top-nav-battery';
import TopNavModes from './top-nav-modes';

type Props = {
  tenantName: string;
  credits: number;
  lifetimeTopup: number;
};

/**
 * Full-width top chrome rendered above the 3-column shell.
 * Layout: [mode tabs] [brand] [search] [battery]
 *
 * Mode switching used to live in the left rail; with the new
 * chat-as-rail layout the rail is entirely the chat panel, so
 * mode tabs moved up here.
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
      <TopNavModes />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 1rem',
          borderRight: '1px solid var(--kitz-border)',
          flexShrink: 0,
        }}
      >
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
          title={`KitZ AI Workspace · ${tenantName}`}
        >
          KitZ AI Workspace
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 1rem' }}>
        <TopNavSearch />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <TopNavBattery credits={credits} lifetimeTopup={lifetimeTopup} />
      </div>
    </header>
  );
}
