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
 *
 * Layout: [brand · 17rem] [search · flex] [modes + battery · ~26rem]
 *
 * Widths are intentionally locked to the underlying shell columns so the
 * vertical seams in the TopNav line up exactly with the left rail's right
 * edge and the chat panel's left edge below.
 *   - brand block          == ShellNav width (17rem)
 *   - right group          == ShellChat width (clamp 20–26rem)
 */
export default function TopNav({ tenantName, credits, lifetimeTopup }: Props) {
  const railWidth = '17rem';
  const chatWidth = 'clamp(20rem, 24vw, 26rem)';

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'stretch',
        height: '2.75rem',
        flexShrink: 0,
        borderBottom: '1px solid var(--kitz-line-strong)',
        background: 'var(--kitz-bg)',
      }}
    >
      {/* Brand-prefix slot — width matches ShellNav so the right edge aligns
          with the rail's right edge. Left intentionally minimal: brand
          identity lives in the rail's workspace switcher below. */}
      <div
        style={{
          width: railWidth,
          display: 'flex',
          alignItems: 'center',
          padding: '0 1rem',
          borderRight: '1px solid var(--kitz-line-strong)',
          flexShrink: 0,
        }}
        title={tenantName}
      >
        <span
          style={{
            color: 'var(--kitz-ink-3)',
            fontSize: '0.7rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          KitZ · Workspace
        </span>
      </div>

      {/* Search — flexes between the two locked columns */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '0 1rem',
        }}
      >
        <TopNavSearch />
      </div>

      {/* Modes + battery — width matches ShellChat so the seam lines up with the chat panel's left edge */}
      <div
        style={{
          width: chatWidth,
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'flex-end',
          borderLeft: '1px solid var(--kitz-line-strong)',
          flexShrink: 0,
        }}
      >
        <TopNavModes />
        <TopNavBattery credits={credits} lifetimeTopup={lifetimeTopup} />
      </div>
    </header>
  );
}
