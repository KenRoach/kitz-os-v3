# ADR-0005: 6-digit OTP code over magic link for login

- **Status:** accepted
- **Date:** 2026-04-17
- **Deciders:** @KenRoach

## Context

Supabase Auth supports both magic link (signed URL emailed to user) and OTP
(6-digit code emailed to user). Both provide passwordless sign-in. We must
pick one as the primary flow for the Spanish-first LATAM SMB audience.

## Decision

Use a **6-digit OTP code** as the primary login flow. Magic link is not
offered in Phase 1-2 UI. Users type the code into a dedicated verify screen.

## Consequences

### Positive

- Works on any device: phone-only users can read code in Gmail app and type
  it into the browser on the same phone without an email-deep-link round trip.
- Recoverable on corporate email systems that rewrite links (many LATAM SMBs
  use Microsoft 365 / Google Workspace with Safe Links scanning).
- No risk of link expiry confusion — code is short, typed, and obviously
  time-bound.
- Matches v2 behaviour; users already know it.

### Negative

- Extra UI step (enter code) vs. single click of magic link.
- Typing a code is marginally slower than clicking a link.

### Neutral

- We can add magic link later as a secondary flow for power users without
  changing the underlying provider.

## Alternatives considered

### Magic link as primary

Rejected — Safe-Links rewriting, mobile-app email deep linking, and tab/session
mismatch cause measurable friction in LATAM B2B email environments.

### Both offered side-by-side

Rejected for Phase 1 — doubles the UI surface and doubles the tests. Keep it
simple; revisit based on user feedback.
