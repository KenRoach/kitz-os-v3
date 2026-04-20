/**
 * MobileMount — server-rendered wrapper that mounts MobileShell only on
 * viewports <= 768px via CSS. We render both layouts (desktop chrome
 * lives in the parent layout, mobile lives here) and let the browser
 * pick one based on viewport. This keeps the server-render simple and
 * avoids any client-only JS in the initial paint.
 *
 * The mobile shell is fixed-position and covers the whole viewport,
 * including stacking above the SandboxBanner / TopNav / sidebar / chat
 * panel rendered by the parent layout.
 */

import MobileShell from './mobile-shell';

type Props = {
  tenantName: string;
  credits: number;
  email: string;
  mode: 'sandbox' | 'live';
  hasLive: boolean;
};

export default function MobileMount(props: Props) {
  return (
    <>
      <style>{`
        /* Default: hide mobile shell on desktop */
        .kitz-mobile-mount { display: none; }
        @media (max-width: 768px) {
          /* Mobile: show the mobile shell, hide the desktop chrome behind it */
          .kitz-mobile-mount { display: block; }
        }
      `}</style>
      <div className="kitz-mobile-mount">
        <MobileShell {...props} />
      </div>
    </>
  );
}
