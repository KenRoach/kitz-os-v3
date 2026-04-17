# ADR-0004: Inter-service auth via `jose` HS256 JWT

- **Status:** accepted
- **Date:** 2026-04-17
- **Deciders:** @KenRoach

## Context

`apps/web` (Next.js) calls `apps/ai-runtime` (Fastify) for chat, agents, and
WhatsApp operations. The network path between them is private but we still
need per-request authentication + per-tenant scope, and we want the runtime
to reject unsigned traffic if the private network is ever misconfigured.

## Decision

Use **`jose`** (5.x) with **HS256** and a shared `SERVICE_JWT_SECRET`
(32+ bytes). Tokens carry `iss=web`, `aud=ai-runtime`, `sub=tenant_id`, and
a **5-minute TTL**. Web signs per request, runtime verifies via Fastify
preHandler. Signature and expiry enforced. Secret rotated monthly.

## Consequences

### Positive

- Stateless — no token store needed.
- Short TTL limits replay window to 5 minutes.
- `jose` is edge-runtime compatible (future Vercel edge routes can reuse it).
- Zod + strict claim checks catch malformed tokens early.

### Negative

- Symmetric secret must be present in both services. Leak = full compromise.
  Mitigation: secret lives only in environment variables (Vercel + Railway
  project secrets), rotated monthly, never committed, scanned by gitleaks.
- No key rotation without a brief overlap window. Mitigation: documented
  runbook for rotation (accept both secrets for 10 min during cut-over).

### Neutral

- Upgrade path to **RS256** is straightforward: ai-runtime holds only the
  public key. Documented for Phase 3 if we add third-party integrators.

## Alternatives considered

### mTLS

Rejected for now — ops burden for certificate management outweighs benefit
given both services are in the same trust boundary.

### Supabase JWT passthrough

Rejected — leaks user context unnecessarily to the runtime and couples the
runtime to Supabase session lifecycle.

### Shared API key header

Rejected — no per-tenant scope, no expiry, worse auditability.
