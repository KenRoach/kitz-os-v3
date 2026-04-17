import Fastify, { type FastifyInstance } from 'fastify';
import type { ApiEnvelope, HealthStatus } from '@kitz/types';
import { requireServiceJwt } from './auth.js';
import { registerChat } from './chat.js';

const SERVICE_NAME = 'ai-runtime';
const SERVICE_VERSION = '0.0.0';
const STARTED_AT = Date.now();

export type BuildAppOptions = {
  serviceJwtSecret: string;
};

/**
 * Build the Fastify app. Exposed as a factory so tests can inject secrets
 * and run on ephemeral ports.
 */
export function buildApp(opts: BuildAppOptions): FastifyInstance {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      redact: {
        paths: ['req.headers.authorization', 'email', 'phone', 'token', 'password'],
        censor: '[REDACTED]',
      },
    },
  });

  app.get('/live', async () => {
    const body: ApiEnvelope<HealthStatus> = {
      success: true,
      data: {
        service: SERVICE_NAME,
        version: SERVICE_VERSION,
        uptime_ms: Date.now() - STARTED_AT,
        timestamp: new Date().toISOString(),
      },
      error: null,
    };
    return body;
  });

  app.get('/health', { preHandler: requireServiceJwt(opts.serviceJwtSecret) }, async (request) => {
    const body: ApiEnvelope<HealthStatus & { tenant_id: string }> = {
      success: true,
      data: {
        service: SERVICE_NAME,
        version: SERVICE_VERSION,
        uptime_ms: Date.now() - STARTED_AT,
        timestamp: new Date().toISOString(),
        tenant_id: request.tenantId ?? 'unknown',
      },
      error: null,
    };
    return body;
  });

  registerChat(app, opts.serviceJwtSecret);

  return app;
}
