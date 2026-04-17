# ADR-0001: Supabase Auth (OTP) as the sole auth provider

- **Status:** accepted
- **Date:** 2026-04-17
- **Deciders:** @KenRoach

## Context

v2 ran two auth systems in parallel: NextAuth v5 (email OTP) and Supabase Auth.
Session logic, user records, and middleware were split across both, producing
bugs and requiring duplicate RLS work. v3 is a clean rewrite with no migration
constraint carried forward.

## Decision

Use **Supabase Auth** exclusively for authentication in v3. Email OTP / magic
link only — no passwords. Session is cookie-based SSR via the Supabase client.
NextAuth is not installed.

## Consequences

### Positive

- One user table (`auth.users`) as source of truth.
- RLS on tenant tables can key off `auth.uid()` directly.
- Fewer dependencies, smaller bundle.
- One login surface to test, rate-limit, and monitor.

### Negative

- Ties auth to Supabase availability. Mitigation: Supabase has an SLA; auth
  outages are rare and would block the DB anyway.
- Loses NextAuth's broad adapter ecosystem (social providers). Acceptable for
  Phase 1-2; can add Supabase-native OAuth providers later if needed.

### Neutral

- Magic link vs. 6-digit code is a UX decision handled in the auth module, not
  the provider decision.

## Alternatives considered

### Keep NextAuth + Supabase (v2 approach)

Rejected — the exact problem we are fixing.

### Clerk / Auth0

Rejected — adds a vendor, costs more at scale, and duplicates the user record
Supabase already owns.

### Lucia / self-hosted

Rejected — more code to maintain for no differentiated benefit while Supabase
already hosts the database.
