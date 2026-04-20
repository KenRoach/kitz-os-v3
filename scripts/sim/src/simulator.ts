/**
 * 90-day license simulator.
 *
 * Per license:
 *   1. Sign up the "owner" user (one signup per license — multi-user
 *      is modelled analytically by amplifying daily message volume by
 *      `userCount`, not by spawning N HTTP signups, which would just
 *      stress the OTP flow without changing the unit economics)
 *   2. Optionally upgrade to starter/pro on day 0
 *   3. For each day 0..N-1:
 *        - Roll active/inactive per the retention curve
 *        - Decide which users are active today
 *        - For each active user:
 *            - sample device (mobile/desktop)
 *            - sample sessions × messages-per-session via poisson
 *            - issue chat debits
 *            - if battery low: roll topup-or-abandon
 *        - On day 30/60: re-run plan upgrade to trigger renewal grant
 *   4. Snapshot final billing state
 *   5. Run invariant checks against snapshot
 */

import type { Client } from './client';
import type { Metrics } from './metrics';
import { Client as HttpClient } from './client';
import {
  type SimConfig,
  type PlanId,
  type WorkPack,
  type Device,
  pickTopupForRunway,
  PLAN_PRICE_CENTS,
  PLAN_MONTHLY_CREDITS,
  TOPUP_PACKS,
  CHAT_COST_CREDITS,
} from './config';
import { type Rng, makeRng } from './rng';
import { isActiveDay, poisson, weightedPick } from './distributions';
import { signupAndOnboard } from './flows/signup';
import { upgradePlan } from './flows/upgrade';
import { sendChatMessages } from './flows/chat';
import { buyTopup } from './flows/topup';

export type LicenseProfile = {
  licenseId: string;
  plan: PlanId;
  workPack: WorkPack;
  userCount: number;
  /** Per-user device assignment, fixed for the run. */
  deviceByUser: Device[];
};

export type LicenseResult = {
  licenseId: string;
  plan: PlanId;
  workPack: WorkPack;
  userCount: number;
  /** Whether signup + onboarding completed (entire license fails together). */
  onboarded: boolean;
  /** Failure stage if onboarded === false. */
  failureStage?: string;
  failureReason?: string;
  /** Number of days the license had at least one active user. */
  activeDays: number;
  /** Total messages successfully debited across all users. */
  totalMessagesDebited: number;
  /** Total messages blocked by 402 across all users. */
  totalMessagesBlocked: number;
  /** Number of topups purchased. */
  topupsPurchased: number;
  /** Number of times a topup was offered but the user abandoned. */
  topupsAbandoned: number;
  /** Final battery snapshot. */
  finalBalance: number;
  finalLifetimeTopup: number;
  finalLifetimeDebit: number;
  /** Total revenue from this license over the horizon (cents). */
  planRevenueCents: number;
  topupRevenueCents: number;
  /** Per-device message split. */
  mobileMessages: number;
  desktopMessages: number;
};

type BillingSnapshot = {
  battery: { balance: number; lifetime_topup: number; lifetime_debit: number };
  ledger: Array<{ delta: number; reason: string; metadata: Record<string, unknown> }>;
};

export async function generateLicenseProfiles(cfg: SimConfig, rng: Rng): Promise<LicenseProfile[]> {
  const out: LicenseProfile[] = [];
  for (let i = 0; i < cfg.licenses; i++) {
    const lrng = rng.child(`license-${i}`);
    const plan = weightedPick(lrng, cfg.planDistribution);
    const workPack = weightedPick(lrng, cfg.workPackDistribution);
    const userCount = lrng.int(cfg.usersPerLicense.min, cfg.usersPerLicense.max);
    const deviceByUser: Device[] = [];
    for (let u = 0; u < userCount; u++) {
      deviceByUser.push(weightedPick(lrng, cfg.deviceSplit));
    }
    out.push({
      licenseId: `lic-${String(i).padStart(4, '0')}`,
      plan,
      workPack,
      userCount,
      deviceByUser,
    });
  }
  return out;
}

export async function simulateLicense(opts: {
  cfg: SimConfig;
  metrics: Metrics;
  profile: LicenseProfile;
  seed: number;
}): Promise<LicenseResult> {
  const { cfg, metrics, profile, seed } = opts;
  const lrng = makeRng(seed);
  const client = new HttpClient({ baseUrl: cfg.baseUrl, metrics });

  const result: LicenseResult = {
    licenseId: profile.licenseId,
    plan: profile.plan,
    workPack: profile.workPack,
    userCount: profile.userCount,
    onboarded: false,
    activeDays: 0,
    totalMessagesDebited: 0,
    totalMessagesBlocked: 0,
    topupsPurchased: 0,
    topupsAbandoned: 0,
    finalBalance: 0,
    finalLifetimeTopup: 0,
    finalLifetimeDebit: 0,
    planRevenueCents: 0,
    topupRevenueCents: 0,
    mobileMessages: 0,
    desktopMessages: 0,
  };

  // 1. Signup
  const email = `sim-${profile.licenseId}@kitz.test`;
  const signup = await signupAndOnboard({
    client,
    metrics,
    licenseId: profile.licenseId,
    email,
    fullName: `Sim ${profile.licenseId}`,
    workspaceName: `Tenant ${profile.licenseId}`,
    preferredSlug: profile.licenseId,
    workPack: profile.workPack,
    plan: profile.plan,
  });
  if (!signup.ok) {
    result.failureStage = signup.stage;
    result.failureReason = signup.reason;
    return result;
  }
  result.onboarded = true;

  // 2. Day-0 plan upgrade
  if (profile.plan !== 'free') {
    const up = await upgradePlan({ client, metrics, licenseId: profile.licenseId, plan: profile.plan });
    if (!up.ok) {
      result.failureStage = 'upgrade';
      result.failureReason = up.reason ?? 'unknown';
      // Continue anyway — they're stuck on free plan, but the sim still
      // exercises their usage on the seeded 100-credit grant.
    }
  }

  // 3. Daily loop. Track current battery balance locally to decide topups.
  // We trust the server's accounting; this local tally is only for the
  // topup decision (avoids a GET /api/billing on every iteration).
  let localBalance = PLAN_MONTHLY_CREDITS[profile.plan]; // grant-on-upgrade or seeded free
  // The free plan gets seeded with 100 cr; paid plans got their grant via setPlan.
  // (The server does the actual math; we just need an estimate to decide
  // when to top up.)
  let localTopup = localBalance;
  let localDebit = 0;
  let topupsPurchased = 0;
  let topupsAbandoned = 0;

  for (let day = 0; day < cfg.days; day++) {
    // Plan renewal grants on day 30 / 60 boundaries (mirrors setPlan
    // monthly grant logic).
    if (profile.plan !== 'free' && (day === 30 || day === 60)) {
      const renew = await upgradePlan({ client, metrics, licenseId: profile.licenseId, plan: profile.plan });
      if (renew.ok) {
        localBalance += PLAN_MONTHLY_CREDITS[profile.plan];
        localTopup += PLAN_MONTHLY_CREDITS[profile.plan];
      }
    }

    // For each user in this license, decide if active today.
    let dayActive = false;
    for (let u = 0; u < profile.userCount; u++) {
      const urng = lrng.child(`u${u}-d${day}`);
      const active = isActiveDay(urng, day, cfg.retentionD30[profile.plan]);
      if (!active) continue;
      dayActive = true;

      const device = profile.deviceByUser[u]!;
      const lambdaPerSession = cfg.messagesPerSession[device];
      let dayMessages = 0;
      for (let s = 0; s < cfg.sessionsPerDay; s++) {
        dayMessages += poisson(urng, lambdaPerSession);
      }
      if (dayMessages === 0) continue;

      const isFirst = result.totalMessagesDebited === 0;
      const sent = await sendChatMessages({
        client,
        metrics,
        licenseId: profile.licenseId,
        count: dayMessages,
        isFirst,
      });
      result.totalMessagesDebited += sent.debited;
      result.totalMessagesBlocked += sent.blocked;
      if (device === 'mobile') result.mobileMessages += sent.debited;
      else result.desktopMessages += sent.debited;
      localDebit += sent.debited * CHAT_COST_CREDITS;
      localBalance -= sent.debited * CHAT_COST_CREDITS;

      // 4. Topup-or-abandon when the battery dips
      if (localBalance < cfg.topupTriggerBalance) {
        metrics.recordEvent(profile.licenseId, 'topup_offered');
        const willBuy = lrng.bool(cfg.topupConversion[profile.plan]);
        if (willBuy) {
          const remainingDays = cfg.days - day;
          const expectedDailyDebit = Math.max(
            (lambdaPerSession * cfg.sessionsPerDay * CHAT_COST_CREDITS) / 1,
            10,
          );
          const pack = pickTopupForRunway(remainingDays, expectedDailyDebit);
          const purchase = await buyTopup({
            client,
            metrics,
            licenseId: profile.licenseId,
            packId: pack.id,
          });
          if (purchase.ok) {
            localBalance += pack.credits;
            localTopup += pack.credits;
            result.topupRevenueCents += pack.priceCents;
            topupsPurchased++;
          }
        } else {
          metrics.recordEvent(profile.licenseId, 'topup_abandoned');
          topupsAbandoned++;
          // User abandons for the rest of this license — but for sim
          // simplicity we just stop their usage today and let them
          // potentially become inactive via the retention check.
          break;
        }
      }
    }
    if (dayActive) result.activeDays++;
  }

  result.topupsPurchased = topupsPurchased;
  result.topupsAbandoned = topupsAbandoned;

  // 4. Final snapshot from /api/billing — single source of truth
  try {
    const snap = await client.request<{ data: BillingSnapshot | null }>('GET', '/api/billing');
    if (snap.body?.data) {
      result.finalBalance = snap.body.data.battery.balance;
      result.finalLifetimeTopup = snap.body.data.battery.lifetime_topup;
      result.finalLifetimeDebit = snap.body.data.battery.lifetime_debit;
    }
  } catch {
    /* network blip; leave zeros */
  }

  // 5. Plan revenue: count whole months billed. Day-0 + day-30 + day-60
  // grants → 3 months for paid plans on a 90-day horizon.
  if (profile.plan !== 'free') {
    const months = Math.floor(cfg.days / 30) + (cfg.days % 30 > 0 ? 1 : 0);
    result.planRevenueCents = PLAN_PRICE_CENTS[profile.plan] * months;
  }

  // 6. Invariant check — ledger accounting identity should hold:
  //    balance == lifetime_topup - lifetime_debit
  const expected = result.finalLifetimeTopup - result.finalLifetimeDebit;
  if (Math.abs(result.finalBalance - expected) > 0) {
    metrics.recordViolation({
      kind: 'ledger_identity_mismatch',
      detail: `balance=${result.finalBalance} but lifetime_topup-lifetime_debit=${expected}`,
      licenseId: profile.licenseId,
    });
  }

  return result;
}

/**
 * Run all licenses with bounded concurrency. Yields each result as it
 * completes so the caller can stream progress to stdout / write CSV
 * without buffering everything in memory.
 */
export async function* runAll(opts: {
  cfg: SimConfig;
  metrics: Metrics;
  profiles: LicenseProfile[];
  seed: number;
  onProgress?: (done: number, total: number) => void;
}): AsyncGenerator<LicenseResult> {
  const { cfg, metrics, profiles, seed, onProgress } = opts;
  const queue = [...profiles];
  const inflight = new Map<number, Promise<{ idx: number; result: LicenseResult }>>();
  let nextIdx = 0;
  let completed = 0;

  // Prime
  while (inflight.size < cfg.concurrency && queue.length > 0) {
    const profile = queue.shift()!;
    const idx = nextIdx++;
    inflight.set(
      idx,
      simulateLicense({ cfg, metrics, profile, seed: seed ^ idx }).then((result) => ({
        idx,
        result,
      })),
    );
  }

  while (inflight.size > 0) {
    const settled = await Promise.race(inflight.values());
    inflight.delete(settled.idx);
    completed++;
    onProgress?.(completed, profiles.length);
    yield settled.result;

    if (queue.length > 0) {
      const profile = queue.shift()!;
      const idx = nextIdx++;
      inflight.set(
        idx,
        simulateLicense({ cfg, metrics, profile, seed: seed ^ idx }).then((result) => ({
          idx,
          result,
        })),
      );
    }
  }
}
