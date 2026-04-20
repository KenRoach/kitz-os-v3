'use client';

/**
 * PrefsSyncMount — tiny client-side mount point for the preferences
 * sync hook. Rendered once from the (server) workspace/layout.tsx so
 * vibe / voice / language stay in sync across desktop and mobile for
 * the current session.
 *
 * Device hint: layout.tsx has no reliable way to distinguish desktop
 * vs mobile server-side (we swap on viewport width), so we pass
 * 'desktop' here and let the mobile shell mount its own
 * <PrefsSyncMount device="mobile" /> separately if we later want
 * precise "which device started this change" attribution.
 */

import { usePrefsSync } from '@/lib/prefs/use-prefs-sync';

export function PrefsSyncMount({
  tenantSlug,
  device = 'desktop',
}: {
  tenantSlug: string;
  device?: 'desktop' | 'mobile';
}): null {
  usePrefsSync(tenantSlug, device);
  return null;
}
