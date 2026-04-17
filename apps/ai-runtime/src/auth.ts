import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyServiceJwt } from '@kitz/config/jwt';
import type { ServiceJwtClaims } from '@kitz/types';

declare module 'fastify' {
  interface FastifyRequest {
    tenantId?: string;
    serviceClaims?: ServiceJwtClaims;
  }
}

/**
 * Fastify preHandler that verifies the service JWT on protected routes.
 * Responds 401 on missing / invalid / expired tokens.
 */
export function requireServiceJwt(secret: string) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      await reply.code(401).send({
        success: false,
        data: null,
        error: 'missing_service_token',
      });
      return;
    }

    const token = header.slice('Bearer '.length).trim();
    try {
      const claims = await verifyServiceJwt(token, secret);
      request.tenantId = claims.sub;
      request.serviceClaims = claims;
    } catch {
      await reply.code(401).send({
        success: false,
        data: null,
        error: 'invalid_service_token',
      });
    }
  };
}
