# KitZ OS v3

> KitZ es el sistema operativo que pone la IA a trabajar en tu negocio.

AI workspace platform for Latin American SMBs. Clean-rewrite successor to
`kitz-os-v2`.

## Status

Phase 1, Module 1 — project scaffold. Inter-service JWT healthcheck green.

## Quick start

```bash
# Requires Node 22 and pnpm 10
nvm use
pnpm install

# Terminal 1 — ai-runtime
SERVICE_JWT_SECRET=$(openssl rand -hex 32) pnpm -C apps/ai-runtime dev

# Terminal 2 — web
SERVICE_JWT_SECRET=<same-secret-as-above> \
OS_RUNTIME_URL=http://localhost:5200 \
pnpm -C apps/web dev

# Visit http://localhost:5100 and http://localhost:5100/api/ai-health
```

## Scripts

| Script              | Purpose                               |
| ------------------- | ------------------------------------- |
| `pnpm dev`          | Run all apps in dev mode (Turbo)      |
| `pnpm build`        | Build all apps + packages             |
| `pnpm test`         | Run all unit + integration tests      |
| `pnpm typecheck`    | TypeScript check across the workspace |
| `pnpm format`       | Prettier write                        |
| `pnpm format:check` | CI gate                               |

## Structure

```
apps/
  web/          Next.js 15 (Vercel)
  ai-runtime/   Fastify 5 (Railway)
packages/
  types/        Shared TypeScript types
  config/       Env schema + service JWT (jose)
  i18n/         Locale dictionaries (es/en/pt)
  flags/        Env-driven feature flags
  ui/           Shared React components
  db/           Supabase client + migrations
  agents/       Agent tool registry
docs/
  adr/          Architecture Decision Records
  architecture.md
  rls-matrix.md
```

## Full spec

See [BOOTSTRAP-PROMPT.md](./BOOTSTRAP-PROMPT.md) for the complete build spec,
v2 audit, and 17-module roadmap.
