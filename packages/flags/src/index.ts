/**
 * @kitz/flags — env-driven feature flags. No vendor lock-in.
 * Flags are `KITZ_FLAG_<NAME>=on|off` in env.
 */

export type FlagName = 'whatsapp' | 'voice' | 'ocr' | 'regional_payments' | 'studio_theming';

const PREFIX = 'KITZ_FLAG_';

export function isEnabled(flag: FlagName, env: NodeJS.ProcessEnv = process.env): boolean {
  const key = `${PREFIX}${flag.toUpperCase()}`;
  const raw = env[key];
  if (!raw) return false;
  return raw.toLowerCase() === 'on' || raw === '1' || raw.toLowerCase() === 'true';
}
