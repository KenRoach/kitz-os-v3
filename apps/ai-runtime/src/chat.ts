import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ApiEnvelope } from '@kitz/types';
import { requireServiceJwt } from './auth.js';

type ChatBody = {
  message: string;
  history?: { role: 'user' | 'kitz'; text: string }[];
};

type ChatReply = {
  reply: string;
  model: 'stub';
  tokensUsed: number;
  latencyMs: number;
};

function validate(body: unknown): { ok: true; data: ChatBody } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'invalid_body' };
  const b = body as Record<string, unknown>;
  if (typeof b['message'] !== 'string') return { ok: false, error: 'missing_message' };
  const message = b['message'].trim();
  if (message.length === 0 || message.length > 4000) {
    return { ok: false, error: 'invalid_message_length' };
  }
  const history = Array.isArray(b['history']) ? (b['history'] as ChatBody['history']) : undefined;
  const out: ChatBody = { message };
  if (history) out.history = history;
  return { ok: true, data: out };
}

/**
 * Stub reply generator. Deterministic and fast — good for tests and for the
 * end-to-end plumbing check. Real Claude/OpenAI routing lands in Module 9.
 */
function stubReply(message: string, tenantId: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('hola') || lower.includes('hi') || lower.includes('hello')) {
    return `Hola 👋 Soy Kitz. Espacio: ${tenantId.slice(0, 8)}. ¿En qué te ayudo?`;
  }
  if (lower.includes('qué puedes') || lower.includes('que puedes')) {
    return 'Puedo ayudarte con contactos, ventas, calendario, WhatsApp y agentes. Conectados en las próximas fases.';
  }
  if (lower.includes('hoy')) {
    return 'Hoy no tengo datos reales todavía. Módulo 7 (CRM) y Módulo 12 (Calendario) llenan esto.';
  }
  return `Recibí: "${message}". LLM real se conecta en Módulo 9.`;
}

export function registerChat(app: FastifyInstance, secret: string): void {
  app.post<{ Body: unknown }>(
    '/chat',
    { preHandler: requireServiceJwt(secret) },
    async (request: FastifyRequest<{ Body: unknown }>, reply) => {
      const parsed = validate(request.body);
      if (!parsed.ok) {
        const body: ApiEnvelope<null> = {
          success: false,
          data: null,
          error: parsed.error,
        };
        return reply.code(400).send(body);
      }

      const started = Date.now();
      const text = stubReply(parsed.data.message, request.tenantId ?? 'unknown');

      const body: ApiEnvelope<ChatReply> = {
        success: true,
        data: {
          reply: text,
          model: 'stub',
          tokensUsed: Math.ceil(text.length / 4),
          latencyMs: Date.now() - started,
        },
        error: null,
      };
      return body;
    },
  );
}
