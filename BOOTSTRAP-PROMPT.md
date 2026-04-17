# KitZ OS v3 — Full Build Prompt

> Paste this entire prompt into a new Claude Code session to bootstrap kitz-os-v3 from scratch.

---

## Mission

You are building **KitZ OS v3** — a complete rewrite of the KitZ AI workspace platform for Latin American SMBs. The goal is full feature parity with v2 but with clean architecture, strict code quality, comprehensive tests, and simplified code.

**Brand rules:**
- Product name: "KitZ" — NEVER "KitZ OS", "KitZ(OS)", or "KitZ (OS)"
- Kitz greets as "Kitz, tu asistente personal"
- Company: KitZ is an **AI Services Business**
- Tagline: "KitZ es el sistema operativo que pone la IA a trabajar en tu negocio"
- Spanish-first, warm, direct

## Source Material

- **v2 codebase (reference only, do not fork):** https://github.com/KenRoach/kitz-os-v2.git
- **v3 repo (build here):** https://github.com/KenRoach/kitz-os-v3.git — already created, clone it
- **Live v2 workspace:** https://workspace.kitz.services/workspace?slug=kenneth-roach

## v2 Audit Summary (What to Fix in v3)

### Critical Issues in v2
1. **2% test coverage** — only 5 test files for 282 source files and 62 API routes
2. **Dashboard page is 1,309 lines** — needs to be split into <300-line components
3. **Several components 400-700+ lines** — CalendarView (462), ChatPanel (499), CRMView (365), PageSettings (514), PageBrainPages (727)
4. **Tool files are 800+ lines each** — 500+ tools in monolithic category files
5. **Two competing auth systems** — NextAuth v5 OTP + Supabase Auth (consolidate to Supabase only)
6. **No API documentation** — 62 endpoints with no OpenAPI/Swagger
7. **101 console.log/TODO markers** scattered in production code
8. **No tool versioning or deprecation system**
9. **RLS policies scattered across migration 007** — need documented matrix
10. **WhatsApp error handling unclear** — multi-session recovery not robust

### What Works Well in v2 (Keep)
- Turborepo monorepo structure (web + ai-runtime separation)
- Supabase PostgreSQL with RLS
- Multi-tenant architecture (tenant_id filtering)
- Email OTP passwordless auth (keep, but on Supabase Auth only)
- Agent triage router (Haiku fast path + Sonnet complex)
- Draft-first philosophy for outbound comms
- 4-role permission system (Owner/Admin/Member/Viewer)
- Circuit breaker pattern in AI runtime
- BatteryLedger credit tracking

## Architecture Decision: v3 Stack

```
kitz-os-v3/
├── apps/
│   ├── web/                    # Next.js 15 (App Router) on Vercel, port 5100
│   │   ├── app/                # Pages and API routes
│   │   ├── components/         # UI components (<300 lines each)
│   │   └── lib/                # Utilities, hooks, stores
│   └── ai-runtime/             # Fastify 5 on Railway, port 5200
│       ├── agents/             # Agent definitions
│       ├── engine/             # LLM hub, battery, circuit breaker
│       └── integrations/       # WhatsApp, calendar, voice
├── packages/
│   ├── ui/                     # Shared React components (design system)
│   ├── db/                     # Supabase client + migrations
│   ├── agents/                 # Tool definitions (1 file per tool, max 100 lines)
│   ├── config/                 # Validation schemas, constants
│   └── types/                  # Shared TypeScript types
├── docs/
│   └── superpowers/specs/      # Design specs
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Monorepo | Turborepo + pnpm | Workspace protocol |
| Frontend | Next.js 15, React 19, TypeScript 5 | App Router only |
| Styling | Tailwind 4 | No CSS modules, no styled-components |
| State | Zustand + SWR | Zustand for client state, SWR for server state |
| Auth | Supabase Auth (OTP/magic link) | NO NextAuth. Single auth provider |
| Database | PostgreSQL via Supabase | RLS on all tenant tables |
| AI Runtime | Fastify 5 | Separate service, JWT auth between services |
| LLM | Claude (Anthropic) primary, OpenAI fallback | Via AI SDK |
| Queue | BullMQ + Redis | For async jobs (WhatsApp, email, etc.) |
| WhatsApp | Baileys v7 | QR-based session, multi-tenant |
| Email | Resend | Transactional emails |
| Voice | ElevenLabs | Rachel voice, eleven_multilingual_v2 |
| Payments | Stripe primary | Regional: Yappy, BAC, PayPal |
| Observability | Sentry + Langfuse + Pino | Error tracking, LLM tracing, structured logs |
| Testing | Vitest + Playwright | Unit/integration + E2E |
| Deploy | Vercel (web) + Railway (runtime) | Auto-deploy from main |

## Auth Flow (Supabase OTP Only)

```
1. User enters email → POST /api/auth/otp → Supabase sends 6-digit code
2. User submits code → POST /api/auth/verify → Supabase validates, returns session
3. Middleware checks Supabase session on all /workspace/* routes
4. New users → redirect to /onboarding
5. Existing users → redirect to /workspace?slug={their-slug}
```

- No passwords anywhere
- Session managed by Supabase (cookie-based SSR)
- 4 roles: Owner, Admin, Member, Viewer
- RLS enforces tenant isolation at database level

## Full Feature Scope (All 15 Modules)

Build these in order. Each module must have tests before moving to the next.

### Phase 1: Foundation
1. **Project scaffold** — Turborepo, packages, configs, CI
2. **Auth (Supabase OTP)** — Login, verify, session, middleware, RLS
3. **Onboarding** — Workspace creation, profile setup, slug generation
4. **Workspace layout** — 3-column shell (nav | canvas | chat), responsive, tabs

### Phase 2: Core Features
5. **Dashboard** — Stats grid, readiness checklist, quick links (split into <300-line components)
6. **Chat panel** — Kitz assistant, context-aware skill selector, message history
7. **Contacts (CRM)** — CRUD, search, import/export, activity timeline
8. **Deals/Orders** — Pipeline stages, CRUD, status tracking

### Phase 3: AI & Automation
9. **AI agents/pipelines builder** — Custom agent creation, prompt editor, tool selection
10. **Skills/knowledge base** — Skill creation, training data, knowledge ingestion
11. **WhatsApp connector** — Baileys QR connect, multi-session, auto-reply, triage routing

### Phase 4: Business Tools
12. **Calendar integration** — Google Calendar OAuth, homebrew calendar, event CRUD
13. **Invoicing/quoter** — Quote generation, PDF export, status tracking
14. **Billing/payments** — Stripe integration, plans, usage tracking, regional payments
15. **OCR/scanning** — Document upload, text extraction, data parsing

### Phase 5: Customization
16. **Studio/theming** — Color palette, typography, logo, full workspace customization
17. **Settings** — Workspace config, members, API keys, integrations, WhatsApp settings

## Code Quality Rules (ENFORCED)

### File Size Limits
- **Components: max 300 lines** — split at this threshold, no exceptions
- **API routes: max 150 lines** — extract logic to service files
- **Service files: max 400 lines** — split into focused modules
- **Tool definitions: max 100 lines per tool** — one file per tool
- **Total per module: track LOC** — flag if any single module exceeds 2,000 lines

### Testing Requirements
- **80% minimum coverage** across all packages
- **Every API route** gets integration tests
- **Every component** gets unit tests
- **Auth flow** gets E2E tests (Playwright)
- **Write tests FIRST** (TDD) — red → green → refactor
- Use Vitest for unit/integration, Playwright for E2E

### Code Standards
- Zero console.log in production code (use Pino logger)
- Zero TODO/FIXME markers (create GitHub issues instead)
- All functions <50 lines
- No deep nesting (>3 levels → extract early returns)
- Immutable patterns (new objects, never mutate)
- All user input validated with Zod schemas
- All API responses use consistent envelope: `{ success, data, error, meta }`

### Database Standards
- Every table has RLS policies documented inline
- Migration files include rollback SQL
- All queries parameterized (no string interpolation)
- Indexes on all foreign keys and frequently queried columns
- RLS matrix documented in `docs/rls-matrix.md`

### Documentation
- OpenAPI/Swagger spec for all API routes
- JSDoc on all exported functions
- README per package explaining purpose and usage
- Architecture diagram in `docs/architecture.md`

## Database Schema (Clean v3)

Consolidate v2's 25 migrations into a clean initial schema. Key tables:

```sql
-- Multi-tenancy
tenants (id, slug, name, plan, settings JSONB, created_at)
user_profiles (id, tenant_id, email, full_name, role, avatar_url, created_at)
workspace_members (id, tenant_id, user_id, role, invited_by, joined_at)

-- CRM
contacts (id, tenant_id, name, email, phone, company, tags[], notes, created_at)
deals (id, tenant_id, contact_id, title, amount, stage, probability, closed_at, created_at)
deal_stages (id, tenant_id, name, position, color)

-- Communication
conversations (id, tenant_id, contact_id, channel, status, assigned_to, created_at)
messages (id, conversation_id, role, content, metadata JSONB, created_at)
drafts (id, tenant_id, channel, recipient, subject, content, status, approved_by, created_at)

-- AI
agents (id, tenant_id, name, system_prompt, tools[], model, is_active, created_at)
agent_sessions (id, agent_id, conversation_id, started_at, ended_at)
skills (id, tenant_id, name, description, content, category, created_at)
knowledge_base (id, tenant_id, skill_id, chunk, embedding vector(1536), created_at)
ai_battery (id, tenant_id, credits_remaining, credits_used, reset_at)
brain_config (id, tenant_id, triage_model, complex_model, auto_reply, persona JSONB)
brain_logs (id, tenant_id, session_id, input, output, model, tokens_used, latency_ms, created_at)

-- WhatsApp
whatsapp_sessions (id, tenant_id, phone, status, qr_code, connected_at, created_at)

-- Calendar
calendar_events (id, tenant_id, title, description, start_at, end_at, attendees[], google_event_id, created_at)

-- Commerce
orders (id, tenant_id, contact_id, items JSONB, subtotal, tax, total, status, created_at)
products (id, tenant_id, name, description, price, sku, stock, category, created_at)
invoices (id, tenant_id, order_id, number, items JSONB, total, status, pdf_url, due_at, created_at)

-- System
api_keys (id, tenant_id, name, key_hash, scopes[], last_used_at, created_at)
activity_feed (id, tenant_id, actor_id, action, entity_type, entity_id, metadata JSONB, created_at)
```

All tables get:
- `id` as UUID (gen_random_uuid())
- `created_at` with default now()
- RLS policy filtering by tenant_id
- Appropriate indexes

## AI Runtime Architecture

```
Request Flow:
1. Web app POST /api/chat → proxies to ai-runtime
2. ai-runtime authenticates via JWT (inter-service)
3. TriageRouter classifies intent (Haiku fast path)
4. AgentRunner selects agent + tools based on classification
5. LLMHub executes with Claude (primary) or OpenAI (fallback)
6. BatteryLedger deducts credits
7. Response streamed back to web app
8. brain_logs records trace (Langfuse)

Agent System:
- 6 built-in agents: Luna (SDR), Marco (AE), Nova (Support), Sage (Retention), Flux (Finance), Creativa (Content)
- Custom agent builder: tenants define name, prompt, tool selection
- Tool scopes: read_only, draft (needs approval), execute (direct), webhook (external)
- Tools organized as 1 file per tool, grouped by category directory
```

## WhatsApp Integration (Baileys)

```
Connection Flow:
1. Tenant opens WhatsApp settings → requests QR code
2. ai-runtime generates QR via Baileys → streams to frontend
3. User scans QR with WhatsApp mobile
4. Session established, stored in whatsapp_sessions
5. Incoming messages → TriageRouter → auto-reply or draft

Key Requirements:
- OGG Opus format for voice notes (not MP3)
- Multi-tenant session isolation
- Graceful reconnection on disconnect
- Message history with pagination
- Rate limiting per tenant
```

## Implementation Instructions

1. **Clone the v3 repo:** `git clone https://github.com/KenRoach/kitz-os-v3.git`
2. **Reference v2 (read-only):** Clone kitz-os-v2 to `/tmp/kitz-os-v2` for reference
3. **Build phase by phase** — do not skip ahead
4. **TDD enforced** — write tests before implementation for every module
5. **Commit after each module** — conventional commits (`feat:`, `fix:`, `refactor:`)
6. **Code review after each phase** — use code-reviewer agent
7. **No file over 300 lines** — split immediately if approaching limit
8. **Spanish-first UI** — all user-facing strings in Spanish, i18n ready for `en`, `pt`

## Environment Variables Needed

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=

# AI
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
ELEVENLABS_API_KEY=

# Email
RESEND_API_KEY=

# WhatsApp
WHATSAPP_META_TOKEN=
WHATSAPP_VERIFY_TOKEN=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE=

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Infrastructure
REDIS_URL=
OS_RUNTIME_URL=
SENTRY_DSN=
LANGFUSE_SECRET_KEY=
LANGFUSE_PUBLIC_KEY=

# App
NEXTAUTH_SECRET= # legacy, remove after migration
NEXT_PUBLIC_APP_URL=https://workspace.kitz.services
```

## Success Criteria

v3 is complete when:
- [ ] All 17 modules implemented and functional
- [ ] 80%+ test coverage across all packages
- [ ] No file exceeds 300 lines (components) / 400 lines (services)
- [ ] Zero console.log in production code
- [ ] Zero TODO/FIXME markers
- [ ] OpenAPI spec covers all API routes
- [ ] RLS matrix documented and tested
- [ ] Login → workspace → chat → CRM → WhatsApp flow works E2E
- [ ] Deploys to Vercel (web) + Railway (runtime) from main branch
- [ ] Performance: dashboard loads in <2s, chat response in <3s
- [ ] All v2 features accessible in v3
- [ ] Spanish-first with i18n support for en/pt

---

*This prompt was generated from a comprehensive audit of kitz-os-v2 (282 files, 36K LOC, 62 API routes, 25 migrations) on 2026-04-17.*
