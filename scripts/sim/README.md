# `@kitz/sim` — End-to-end audit harness

A standalone TypeScript script that drives the wired KitZ API end-to-end against a running dev server, then emits an issue-style audit report covering performance, unit economics, UX funnel, and accounting invariants.

**No app code is modified.** This is a black-box audit — the harness only knows the public HTTP surface.

## What it produces

After a run, `scripts/sim/out/run-{timestamp}/` contains:

| File | Contents |
|---|---|
| `findings.md` | Numbered findings with severity, evidence, recommendation. **Read this first.** |
| `latency.csv` | Per-endpoint p50 / p95 / p99 / error rate |
| `status-codes.csv` | Per-endpoint status-code matrix |
| `licenses.csv` | One row per license: revenue, topups, debits, balance, failures |
| `funnel.csv` | Funnel events globally and broken down by plan |
| `device-split.csv` | Mobile vs desktop message totals |
| `economics.csv` | Per-plan revenue / AI cost / Stripe fees / gross margin |
| `violations.csv` | Accounting invariant violations (empty == clean) |

## Quick start

```bash
# 1. Start the dev server (separate terminal)
pnpm --filter @kitz/web dev

# 2. Mini smoke run — 5 licenses × 7 days, ~30s
pnpm --filter @kitz/sim sim -- --licenses=5 --days=7 --seed=42

# 3. Look at the findings
cat scripts/sim/out/run-*/findings.md | head -60

# 4. Full run — 1001 licenses × 90 days
pnpm --filter @kitz/sim sim
```

## Knobs

All defaults live in `src/config.ts`. Override via CLI:

```bash
pnpm --filter @kitz/sim sim -- \
  --licenses=500 \
  --days=30 \
  --seed=99 \
  --concurrency=12 \
  --baseUrl=http://localhost:5100
```

For deeper changes (plan distribution, retention curves, AI cost rate), edit `DEFAULT_CONFIG` in `src/config.ts` directly.

## How it audits

Per simulated license:

1. **Signup** — POST `/api/auth/otp` (grabs the dev `devCode`) → `/api/auth/verify` → `/api/onboarding`
2. **Plan upgrade** (paid tiers) — `/api/billing/checkout` + `/api/billing/confirm`
3. **Daily loop for N days** — sample active users, sample sessions × messages, drive `/api/chat` to debit credits
4. **Topup-or-abandon** when battery dips below the trigger
5. **Final snapshot** — `GET /api/billing` then check the accounting identity `balance == lifetime_topup - lifetime_debit`

Every HTTP call is timed and bucketed by endpoint. Status codes are tracked. Funnel events fire at semantically meaningful moments (`signup_started`, `first_chat_debited`, `hit_insufficient_credits`, `topup_purchased` …).

## Understanding the findings

Each finding has:
- **ID** — `F-001` style, stable per-run order
- **Severity** — critical / high / medium / low / info
- **Category** — performance / economics / ux / invariant / config
- **Evidence** — the concrete numbers
- **Recommendation** — what to add / change / remove

Severity rules: critical = data correctness or money loss; high = significant UX or perf hit; medium = worth fixing but not blocking; low = polish; info = FYI.

## Caveats

- **Local stub means single-process accounting** — concurrency findings are real for the in-memory store but won't generalize to a real Postgres deployment without re-running against staging.
- **AI cost is computed analytically** from the chat-debit count × `cfg.costs.perMessageCents`. Defaults to a Haiku-class blended rate (`0.08¢/msg`). Adjust for your actual model mix.
- **Chat 502s are expected** when ai-runtime isn't running. The audit reports them but the per-message debit still happened (debit is pre-flight on `/api/chat`), so unit economics stay honest.
- The harness does **not** simulate WhatsApp Baileys load, calendar/OCR write throughput, or contact CRUD churn. None of those debit credits, so they don't move the unit-economics needle. Add them to `simulator.ts` if you want a UX/funnel audit on those surfaces.
