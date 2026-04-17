# KitZ v3 Architecture

## Runtime topology

```
┌──────────────────┐          ┌──────────────────┐
│   apps/web       │  JWT/5m  │  apps/ai-runtime │
│  Next.js 15      ├─────────▶│   Fastify 5     │
│  Vercel :5100    │  jose    │   Railway :5200 │
└────────┬─────────┘          └────────┬─────────┘
         │                              │
         │ Supabase session             │ Supabase service role
         ▼                              ▼
     ┌────────────────────────────────────────┐
     │     Supabase (PostgreSQL + Auth)       │
     │   RLS on every tenant-scoped table     │
     └────────────────────────────────────────┘
```

## Package graph

```
apps/web ─────▶ @kitz/config, @kitz/types, @kitz/i18n, @kitz/ui
apps/ai-runtime ─▶ @kitz/config, @kitz/types, @kitz/agents
@kitz/config ─▶ @kitz/types
```

Only `apps/*` may depend on runtime framework packages. Shared packages stay
framework-agnostic so both services can consume them.

## Healthcheck flow (Phase 1)

1. Client hits `GET /api/ai-health` on the web app.
2. Web signs a service JWT with `SERVICE_JWT_SECRET` (5-min TTL).
3. Web calls `GET /health` on ai-runtime with `Authorization: Bearer <token>`.
4. ai-runtime verifies via `jose` preHandler, attaches `tenantId` to request.
5. ai-runtime returns `{ success, data: { service, version, uptime_ms, tenant_id } }`.
6. Web proxies the response back to the client.

This proves the inter-service auth handshake works end-to-end before any
business logic is added.

## Key principles

- **Clean separation:** web never imports from ai-runtime and vice versa.
  Shared contracts live in `@kitz/types`.
- **Envelope pattern:** all API responses return `{ success, data, error, meta }`.
- **Tenant isolation:** every tenant-scoped DB query is RLS-protected.
- **Draft-first:** outbound communications default to drafts pending approval.
- **Observability by default:** Pino logs with PII redaction, Sentry traces,
  Langfuse for LLM calls.
