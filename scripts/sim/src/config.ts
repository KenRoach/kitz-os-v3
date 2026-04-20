/**
 * All knobs in one place. Anything you'd want to A/B-test the audit against
 * lives here. Keep app code untouched; tweak this file and rerun.
 */

export type PlanId = 'free' | 'starter' | 'pro';
export type WorkPack =
  | 'general'
  | 'sales-pipeline'
  | 'appointments'
  | 'service-tickets'
  | 'inquiry-quote'
  | 'recurring-outreach';
export type Device = 'mobile' | 'desktop';

export type SimConfig = {
  baseUrl: string;
  /** Total licenses to simulate. */
  licenses: number;
  /** Simulation horizon in days. */
  days: number;
  /** Deterministic RNG seed. Same seed → byte-identical CSVs. */
  seed: number;
  /** Hard concurrency cap on in-flight licenses. */
  concurrency: number;

  /** Plan distribution (must sum to 1). */
  planDistribution: Record<PlanId, number>;
  /** Workpack distribution. */
  workPackDistribution: Record<WorkPack, number>;
  /** Users per license — uniform [min, max]. */
  usersPerLicense: { min: number; max: number };
  /** Device split. */
  deviceSplit: Record<Device, number>;

  /** Per-plan day-30 retention probability. */
  retentionD30: Record<PlanId, number>;
  /** Per-device messages per session (poisson mean). */
  messagesPerSession: Record<Device, number>;
  /** Sessions per active day (avg). 3 hrs/day across this many sessions. */
  sessionsPerDay: number;

  /** When battery balance drops below this, user considers a topup. */
  topupTriggerBalance: number;
  /** Probability the user actually buys a topup vs abandons. By plan. */
  topupConversion: Record<PlanId, number>;

  /** Cost knobs (cents). */
  costs: {
    /** Anthropic-priced cost per chat message. Default = Haiku ballpark. */
    perMessageCents: number;
    /** Stripe % fee. */
    stripePct: number;
    /** Stripe per-charge flat (cents). */
    stripeFlatCents: number;
  };

  /** Audit thresholds — used to flag findings. */
  thresholds: {
    /** Endpoints slower than this p95 → finding. */
    p95LatencyMs: number;
    /** Error rate above this → finding. */
    errorRatePct: number;
    /** Onboarding completion below this → finding. */
    onboardCompletionPct: number;
    /** Per-tenant gross margin below this → finding. */
    grossMarginPctMin: number;
  };
};

export const DEFAULT_CONFIG: SimConfig = {
  baseUrl: process.env.KITZ_BASE_URL ?? 'http://localhost:5100',
  licenses: 1001,
  days: 90,
  seed: 42,
  concurrency: 24,

  planDistribution: { free: 0.7, starter: 0.22, pro: 0.08 },
  workPackDistribution: {
    general: 0.4,
    'sales-pipeline': 0.18,
    appointments: 0.15,
    'service-tickets': 0.12,
    'inquiry-quote': 0.1,
    'recurring-outreach': 0.05,
  },
  usersPerLicense: { min: 5, max: 25 },
  deviceSplit: { mobile: 0.6, desktop: 0.4 },

  retentionD30: { free: 0.35, starter: 0.65, pro: 0.85 },
  messagesPerSession: { mobile: 18, desktop: 32 },
  sessionsPerDay: 2,

  topupTriggerBalance: 50,
  topupConversion: { free: 0.15, starter: 0.55, pro: 0.8 },

  costs: {
    // Haiku 4.5 ~ $0.0008/msg as a conservative LATAM SMB blend.
    perMessageCents: 0.08,
    stripePct: 0.029,
    stripeFlatCents: 30,
  },

  thresholds: {
    p95LatencyMs: 800,
    errorRatePct: 1.0,
    onboardCompletionPct: 95,
    grossMarginPctMin: 40,
  },
};

/**
 * Plan + topup catalogue mirrored from packages/db/src/billing-plans.ts.
 * Hard-coded here so the sim can run as a standalone script without
 * pulling the workspace package and its node:crypto runtime.
 */
export const PLAN_PRICE_CENTS: Record<PlanId, number> = {
  free: 0,
  starter: 1900,
  pro: 4900,
};

export const PLAN_MONTHLY_CREDITS: Record<PlanId, number> = {
  free: 100,
  starter: 1500,
  pro: 5000,
};

export const TOPUP_PACKS = [
  { id: 'pack_500', credits: 500, priceCents: 500 },
  { id: 'pack_2k', credits: 2000, priceCents: 1800 },
  { id: 'pack_10k', credits: 10000, priceCents: 7900 },
] as const;

export type TopupPackId = (typeof TOPUP_PACKS)[number]['id'];

/** Cost paid per chat message (must match apps/web/app/api/chat/route.ts). */
export const CHAT_COST_CREDITS = 2;

/** Free grant seeded on tenant creation (must match billing.ts). */
export const FREE_GRANT_CREDITS = 100;

export function pickTopupForRunway(
  remainingDays: number,
  expectedDailyDebit: number,
): (typeof TOPUP_PACKS)[number] {
  const need = Math.max(remainingDays * expectedDailyDebit, 100);
  if (need <= 500) return TOPUP_PACKS[0];
  if (need <= 2000) return TOPUP_PACKS[1];
  return TOPUP_PACKS[2];
}
