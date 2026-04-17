# ADR-0002: Turborepo + pnpm workspaces

- **Status:** accepted
- **Date:** 2026-04-17
- **Deciders:** @KenRoach

## Context

v3 ships two runtime services (Next.js web + Fastify ai-runtime) plus shared
packages (types, config, i18n, flags, ui, db, agents). We need consistent
versioning, fast local builds, deterministic installs, and CI caching.

## Decision

Use **Turborepo 2.x** with **pnpm 10** workspaces. Node version pinned to 22
LTS via `.nvmrc` and `engines`. `packageManager` field pins pnpm.

## Consequences

### Positive

- Remote and local caching via Turbo.
- pnpm content-addressable store is fast and disk-efficient.
- Workspace protocol (`workspace:*`) enforces internal package linking.
- Same model as v2 — team already knows it.

### Negative

- Turbo remote cache requires a Vercel account (acceptable, we deploy there).
- pnpm's strict `node_modules` occasionally breaks poorly packaged deps.
  Mitigation: `.npmrc` `public-hoist-pattern` if needed.

### Neutral

- Could have used Nx; we prefer Turbo's simpler mental model for this repo.

## Alternatives considered

### npm / yarn workspaces

Rejected — slower, heavier `node_modules`, no content-addressable store.

### Nx

Rejected — more features than we need, steeper ramp, heavier config surface.

### Single-repo (no monorepo)

Rejected — web and ai-runtime share types, config, and flags. Splitting them
into separate repos would duplicate those and desynchronise them.
