# ADR-0003: Baileys as the sole WhatsApp provider

- **Status:** accepted
- **Date:** 2026-04-17
- **Deciders:** @KenRoach

## Context

KitZ tenants in LATAM SMBs predominantly use personal / SMB WhatsApp numbers.
Meta's WhatsApp Business API requires number verification, a Business Manager,
pre-approved message templates, and per-session fees. Twilio's WhatsApp BSP
rides the same API. Both are friction for a self-serve onboarding flow.

## Decision

Use **Baileys v7** (web-protocol reverse engineered) with QR-code pairing.
Multi-tenant session isolation handled in ai-runtime. No Meta API, no Twilio.

## Consequences

### Positive

- Instant connect via QR — zero Business Manager setup.
- Works with any existing WhatsApp number.
- No per-message cost.
- Full inbound + outbound + media support.

### Negative

- Not officially supported by Meta. Bans possible on abusive usage.
  Mitigation: per-tenant rate limits (Upstash), draft-first sends, DLQ for
  retries, no unsolicited outbound campaigns.
- Session may drop on WhatsApp web-protocol changes. Mitigation: graceful
  reconnection, session persistence, observability via Sentry.
- Not FedRAMP / enterprise-compliant. Acceptable — our ICP is SMB, not gov.

### Neutral

- Future: can add Meta API as an optional provider for enterprise tenants
  behind the `regional_payments`-style flag pattern without disturbing Baileys.

## Alternatives considered

### Meta WhatsApp Business Cloud API

Rejected for self-serve; reconsidered if we enter enterprise segment.

### Twilio WhatsApp

Rejected — extra vendor, extra cost, same Meta API underneath.

### whatsapp-web.js

Rejected — less active maintenance than Baileys; Baileys has better
multi-device + streams support.
