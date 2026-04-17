/**
 * @kitz/types — shared TypeScript types across apps and packages.
 */

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

export type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: Record<string, unknown>;
};

export type ServiceJwtClaims = {
  iss: 'web';
  aud: 'ai-runtime';
  sub: string; // tenant_id
  exp: number;
  iat: number;
};

export type HealthStatus = {
  service: string;
  version: string;
  uptime_ms: number;
  timestamp: string;
};
