import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ApiEnvelope } from '@kitz/types';
import { requireServiceJwt } from './auth.js';

type ChatAgentContext = {
  slug: string;
  name: string;
  systemPrompt: string;
  model: 'haiku' | 'sonnet' | 'opus';
  tools: string[];
};

type ChatBody = {
  message: string;
  history?: { role: 'user' | 'kitz'; text: string }[];
  agent?: ChatAgentContext;
};

type ChatReply = {
  reply: string;
  model: 'stub' | ChatAgentContext['model'];
  agent: { slug: string; name: string } | null;
  tokensUsed: number;
  latencyMs: number;
};

function isAgentCtx(x: unknown): x is ChatAgentContext {
  if (!x || typeof x !== 'object') return false;
  const a = x as Record<string, unknown>;
  return (
    typeof a['slug'] === 'string' &&
    typeof a['name'] === 'string' &&
    typeof a['systemPrompt'] === 'string' &&
    (a['model'] === 'haiku' || a['model'] === 'sonnet' || a['model'] === 'opus') &&
    Array.isArray(a['tools'])
  );
}

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
  if (isAgentCtx(b['agent'])) out.agent = b['agent'];
  return { ok: true, data: out };
}

/**
 * Stub reply generator. When an agent context is provided, the reply
 * mentions the agent name + model + allowed tool count so we can verify
 * the wiring end-to-end without a real LLM.
 *
 * Real Claude/OpenAI routing lands once API keys are wired.
 */
function stubReply(message: string, tenantId: string, agent: ChatAgentContext | undefined): string {
  const lower = message.toLowerCase();
  const who = agent ? agent.name : 'Kitz';
  const space = tenantId.slice(0, 8);

  if (lower.includes('hola') || lower.includes('hi') || lower.includes('hello')) {
    return `Hola 👋 Soy ${who}. Espacio: ${space}. ¿En qué te ayudo?`;
  }
  if (lower.includes('qué puedes') || lower.includes('que puedes')) {
    if (agent) {
      const toolCount = agent.tools.length;
      return `Como ${agent.name} tengo ${toolCount} herramienta${toolCount === 1 ? '' : 's'} habilitada${toolCount === 1 ? '' : 's'}: ${agent.tools.join(', ') || 'ninguna asignada'}.`;
    }
    return 'Sin agente activo. Configura uno en Brain · Agentes para empezar.';
  }
  if (lower.includes('hoy')) {
    return 'Hoy no tengo datos reales todavía. Conecta WhatsApp y agrega contactos para ver actividad.';
  }
  if (agent) {
    return `[${agent.name} · ${agent.model}] Recibí: "${message}". El LLM real responde una vez que conectes una clave de Anthropic u OpenAI.`;
  }
  return `Recibí: "${message}". Configura un agente activo para personalizar las respuestas.`;
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
      const text = stubReply(parsed.data.message, request.tenantId ?? 'unknown', parsed.data.agent);

      const body: ApiEnvelope<ChatReply> = {
        success: true,
        data: {
          reply: text,
          model: parsed.data.agent?.model ?? 'stub',
          agent: parsed.data.agent
            ? { slug: parsed.data.agent.slug, name: parsed.data.agent.name }
            : null,
          tokensUsed: Math.ceil(text.length / 4),
          latencyMs: Date.now() - started,
        },
        error: null,
      };
      return body;
    },
  );
}
