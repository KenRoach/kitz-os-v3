/**
 * Audit report writer.
 *
 * Produces:
 *   - findings.md         — issue-style numbered findings (severity / repro / fix)
 *   - latency.csv         — per-endpoint p50/p95/p99/error rate
 *   - status-codes.csv    — per-endpoint status-code matrix
 *   - licenses.csv        — per-license accounting + revenue
 *   - funnel.csv          — funnel event counts globally and by plan
 *   - device-split.csv    — mobile vs desktop totals
 *   - economics.csv       — per-plan totals (revenue, AI cost, gross margin)
 *   - violations.csv      — invariant violations
 *
 * Findings.md is the executive summary; the CSVs are the evidence.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SimConfig } from './config';
import { PLAN_PRICE_CENTS } from './config';
import type { LicenseResult } from './simulator';
import type { Metrics, FunnelEvent } from './metrics';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type Finding = {
  id: string;
  severity: Severity;
  category: 'performance' | 'economics' | 'ux' | 'invariant' | 'config';
  title: string;
  evidence: string;
  recommendation: string;
};

export type ReportInput = {
  cfg: SimConfig;
  metrics: Metrics;
  results: LicenseResult[];
  startedAt: Date;
  finishedAt: Date;
  outDir: string;
};

export function writeReport(input: ReportInput): void {
  mkdirSync(input.outDir, { recursive: true });
  writeLatencyCsv(input);
  writeStatusCodesCsv(input);
  writeLicensesCsv(input);
  writeFunnelCsv(input);
  writeDeviceSplitCsv(input);
  const economics = writeEconomicsCsv(input);
  writeViolationsCsv(input);
  writeFindingsMd({ ...input, economics });
}

// ---------- CSV writers ----------

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]!);
  const lines = [headers.join(',')];
  for (const row of rows) lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  return lines.join('\n') + '\n';
}

function writeLatencyCsv({ outDir, metrics }: ReportInput): void {
  const rows = metrics.latencyReport().map((r) => ({
    endpoint: r.endpoint,
    count: r.count,
    p50_ms: r.p50.toFixed(1),
    p95_ms: r.p95.toFixed(1),
    p99_ms: r.p99.toFixed(1),
    max_ms: r.max.toFixed(1),
    error_rate_pct: r.errorRatePct.toFixed(2),
  }));
  writeFileSync(join(outDir, 'latency.csv'), csv(rows));
}

function writeStatusCodesCsv({ outDir, metrics }: ReportInput): void {
  const matrix = metrics.statusMatrix();
  const allCodes = new Set<number>();
  for (const m of matrix) for (const c of Object.keys(m.codes)) allCodes.add(Number(c));
  const codeList = Array.from(allCodes).sort((a, b) => a - b);
  const rows = matrix.map((m) => {
    const row: Record<string, unknown> = { endpoint: m.endpoint };
    for (const c of codeList) row[`s${c}`] = m.codes[c] ?? 0;
    return row;
  });
  writeFileSync(join(outDir, 'status-codes.csv'), csv(rows));
}

function writeLicensesCsv({ outDir, results }: ReportInput): void {
  const rows = results.map((r) => ({
    license_id: r.licenseId,
    plan: r.plan,
    work_pack: r.workPack,
    user_count: r.userCount,
    onboarded: r.onboarded,
    failure_stage: r.failureStage ?? '',
    failure_reason: r.failureReason ?? '',
    active_days: r.activeDays,
    msgs_debited: r.totalMessagesDebited,
    msgs_blocked: r.totalMessagesBlocked,
    topups_purchased: r.topupsPurchased,
    topups_abandoned: r.topupsAbandoned,
    final_balance: r.finalBalance,
    lifetime_topup: r.finalLifetimeTopup,
    lifetime_debit: r.finalLifetimeDebit,
    plan_revenue_cents: r.planRevenueCents,
    topup_revenue_cents: r.topupRevenueCents,
    mobile_msgs: r.mobileMessages,
    desktop_msgs: r.desktopMessages,
  }));
  writeFileSync(join(outDir, 'licenses.csv'), csv(rows));
}

function writeFunnelCsv({ outDir, metrics, results }: ReportInput): void {
  const global = metrics.funnelReport();
  const events = Object.keys(global) as FunnelEvent[];

  // By plan: sum each event over licenses with that plan
  const byPlanAndEvent = new Map<string, Map<FunnelEvent, number>>();
  const planByLicense = new Map(results.map((r) => [r.licenseId, r.plan]));
  for (const [licenseId, evMap] of metrics.funnelByLicenseEntries()) {
    const plan = planByLicense.get(licenseId) ?? 'unknown';
    const m = byPlanAndEvent.get(plan) ?? new Map<FunnelEvent, number>();
    for (const [ev, n] of evMap) m.set(ev, (m.get(ev) ?? 0) + n);
    byPlanAndEvent.set(plan, m);
  }

  const rows: Array<Record<string, unknown>> = [];
  for (const ev of events) {
    const row: Record<string, unknown> = { event: ev, total: global[ev] };
    for (const [plan, m] of byPlanAndEvent) row[`plan_${plan}`] = m.get(ev) ?? 0;
    rows.push(row);
  }
  writeFileSync(join(outDir, 'funnel.csv'), csv(rows));
}

function writeDeviceSplitCsv({ outDir, results }: ReportInput): void {
  const totals = results.reduce(
    (acc, r) => {
      acc.mobile_msgs += r.mobileMessages;
      acc.desktop_msgs += r.desktopMessages;
      return acc;
    },
    { mobile_msgs: 0, desktop_msgs: 0 },
  );
  const total = totals.mobile_msgs + totals.desktop_msgs;
  const row = {
    mobile_msgs: totals.mobile_msgs,
    desktop_msgs: totals.desktop_msgs,
    mobile_pct: total > 0 ? ((totals.mobile_msgs / total) * 100).toFixed(2) : '0.00',
    desktop_pct: total > 0 ? ((totals.desktop_msgs / total) * 100).toFixed(2) : '0.00',
  };
  writeFileSync(join(outDir, 'device-split.csv'), csv([row]));
}

type EconomicsRow = {
  plan: string;
  licenses: number;
  total_msgs: number;
  plan_revenue_cents: number;
  topup_revenue_cents: number;
  total_revenue_cents: number;
  ai_cost_cents: number;
  stripe_fees_cents: number;
  gross_margin_cents: number;
  gross_margin_pct: number;
};

function writeEconomicsCsv(input: ReportInput): EconomicsRow[] {
  const { outDir, results, cfg } = input;
  const byPlan = new Map<string, EconomicsRow>();

  for (const r of results) {
    const row =
      byPlan.get(r.plan) ??
      ({
        plan: r.plan,
        licenses: 0,
        total_msgs: 0,
        plan_revenue_cents: 0,
        topup_revenue_cents: 0,
        total_revenue_cents: 0,
        ai_cost_cents: 0,
        stripe_fees_cents: 0,
        gross_margin_cents: 0,
        gross_margin_pct: 0,
      } as EconomicsRow);
    row.licenses += 1;
    row.total_msgs += r.totalMessagesDebited;
    row.plan_revenue_cents += r.planRevenueCents;
    row.topup_revenue_cents += r.topupRevenueCents;
    byPlan.set(r.plan, row);
  }

  for (const row of byPlan.values()) {
    row.total_revenue_cents = row.plan_revenue_cents + row.topup_revenue_cents;
    row.ai_cost_cents = Math.round(row.total_msgs * cfg.costs.perMessageCents);
    // Stripe charges: one per plan period × paying licenses, plus one per topup.
    // Approximate: every license with revenue had at least 1 charge.
    const payingLicenses = row.plan_revenue_cents > 0 ? row.licenses : 0;
    row.stripe_fees_cents =
      Math.round(row.total_revenue_cents * cfg.costs.stripePct) +
      payingLicenses * cfg.costs.stripeFlatCents;
    row.gross_margin_cents = row.total_revenue_cents - row.ai_cost_cents - row.stripe_fees_cents;
    row.gross_margin_pct =
      row.total_revenue_cents > 0
        ? Math.round((row.gross_margin_cents / row.total_revenue_cents) * 1000) / 10
        : 0;
  }

  const rows = Array.from(byPlan.values()).sort((a, b) => a.plan.localeCompare(b.plan));
  writeFileSync(join(outDir, 'economics.csv'), csv(rows as unknown as Record<string, unknown>[]));
  return rows;
}

function writeViolationsCsv({ outDir, metrics }: ReportInput): void {
  const rows = metrics.violationsReport().map((v) => ({
    kind: v.kind,
    license_id: v.licenseId,
    user_id: v.userId ?? '',
    detail: v.detail,
  }));
  writeFileSync(join(outDir, 'violations.csv'), csv(rows));
}

// ---------- Findings (the audit deliverable) ----------

function writeFindingsMd(input: ReportInput & { economics: EconomicsRow[] }): void {
  const { cfg, metrics, results, startedAt, finishedAt, outDir, economics } = input;
  const findings: Finding[] = [];
  let n = 0;
  const nextId = () => `F-${String(++n).padStart(3, '0')}`;

  // ---- Performance findings ----
  const latency = metrics.latencyReport();
  for (const row of latency) {
    if (row.p95 > cfg.thresholds.p95LatencyMs) {
      findings.push({
        id: nextId(),
        severity: row.p95 > cfg.thresholds.p95LatencyMs * 2 ? 'high' : 'medium',
        category: 'performance',
        title: `${row.endpoint} p95 latency ${row.p95.toFixed(0)}ms exceeds ${cfg.thresholds.p95LatencyMs}ms threshold`,
        evidence: `n=${row.count} · p50=${row.p50.toFixed(0)}ms · p95=${row.p95.toFixed(0)}ms · p99=${row.p99.toFixed(0)}ms · max=${row.max.toFixed(0)}ms`,
        recommendation:
          'Profile the endpoint under sim load. Likely culprits: synchronous DB reads, N+1 store calls, or upstream timeouts. See latency.csv for the full distribution.',
      });
    }
    if (row.errorRatePct > cfg.thresholds.errorRatePct) {
      // Status codes that are EXPECTED behavior, not bugs:
      //   402 — insufficient credits on /api/chat (correct guard)
      //   502 — ai-runtime not running (out of scope for this audit)
      //   429 — rate limit hit (correct enforcement; flag separately if needed)
      const expected = new Set([402, 502, 429]);
      const matrix = metrics.statusMatrix().find((m) => m.endpoint === row.endpoint);
      const realErrors = matrix
        ? Object.entries(matrix.codes)
            .filter(([code]) => Number(code) >= 400 && !expected.has(Number(code)))
            .reduce((s, [, c]) => s + c, 0)
        : 0;
      const realErrorRate = (realErrors / row.count) * 100;
      if (realErrorRate > cfg.thresholds.errorRatePct) {
        findings.push({
          id: nextId(),
          severity: realErrorRate > cfg.thresholds.errorRatePct * 5 ? 'critical' : 'high',
          category: 'performance',
          title: `${row.endpoint} unexpected-error rate ${realErrorRate.toFixed(2)}% exceeds ${cfg.thresholds.errorRatePct}%`,
          evidence: `Status codes: ${matrix ? JSON.stringify(matrix.codes) : 'n/a'} (402/502/429 excluded as expected)`,
          recommendation:
            'Triage status-codes.csv. 4xx (excl. 402/429) → API contract drift. 5xx (excl. 502) → server bug or unhandled exception in route handler.',
        });
      }
    }
  }

  // ---- Onboarding completion ----
  const onboardedCount = results.filter((r) => r.onboarded).length;
  const onboardPct = (onboardedCount / Math.max(results.length, 1)) * 100;
  if (onboardPct < cfg.thresholds.onboardCompletionPct) {
    const failures = results.filter((r) => !r.onboarded);
    const stages = failures.reduce<Record<string, number>>((acc, f) => {
      const k = f.failureStage ?? 'unknown';
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
    findings.push({
      id: nextId(),
      severity: onboardPct < 80 ? 'critical' : 'high',
      category: 'ux',
      title: `Onboarding completion ${onboardPct.toFixed(1)}% below ${cfg.thresholds.onboardCompletionPct}% target`,
      evidence: `${failures.length}/${results.length} licenses failed. Stages: ${JSON.stringify(stages)}`,
      recommendation:
        'Inspect licenses.csv for failure_reason patterns. Consider: relaxing OTP rate limit, retrying onboarding on transient errors, or surfacing better validation errors in the wizard.',
    });
  }

  // ---- Economics findings ----
  for (const e of economics) {
    if (e.total_revenue_cents === 0) continue;
    if (e.gross_margin_pct < cfg.thresholds.grossMarginPctMin) {
      findings.push({
        id: nextId(),
        severity: e.gross_margin_pct < 0 ? 'critical' : 'high',
        category: 'economics',
        title: `${e.plan.toUpperCase()} plan gross margin ${e.gross_margin_pct.toFixed(1)}% below ${cfg.thresholds.grossMarginPctMin}% target`,
        evidence: `Revenue $${(e.total_revenue_cents / 100).toFixed(2)} · AI cost $${(e.ai_cost_cents / 100).toFixed(2)} · Stripe fees $${(e.stripe_fees_cents / 100).toFixed(2)} · Margin $${(e.gross_margin_cents / 100).toFixed(2)}`,
        recommendation:
          e.gross_margin_pct < 0
            ? `Plan loses money per license. Either raise price (current: $${(PLAN_PRICE_CENTS[e.plan as 'free' | 'starter' | 'pro'] / 100).toFixed(2)}/mo), reduce included credits, or move to a metered-overage model.`
            : `Margin is thin. Consider tightening the included monthly credit grant or routing this tier to a cheaper model (current sim rate ${cfg.costs.perMessageCents}\u00a2/msg).`,
      });
    }
  }

  // Free-plan AI cost specifically — free is supposed to be free for the user
  // but it costs us real money per chat message.
  const free = economics.find((e) => e.plan === 'free');
  if (free && free.ai_cost_cents > 0) {
    const freeCostPerLicense = free.ai_cost_cents / Math.max(free.licenses, 1);
    findings.push({
      id: nextId(),
      severity: freeCostPerLicense > 50 ? 'high' : 'medium',
      category: 'economics',
      title: `Free plan costs $${(free.ai_cost_cents / 100).toFixed(2)} in AI inference (${(freeCostPerLicense / 100).toFixed(2)} per license)`,
      evidence: `${free.licenses} free licenses sent ${free.total_msgs} messages over ${cfg.days} days`,
      recommendation:
        'Free plan revenue is $0 by definition; this is pure CAC. Either reduce the free monthly grant (current 100 cr → 4 conversion-meaningful conversations), require email verification per session, or rate-limit free-tier chat throughput to dampen the cost.',
    });
  }

  // ---- Topup conversion ----
  const offered = results.reduce(
    (s, r) => s + ((metrics.funnelByLicenseEntries().find(([id]) => id === r.licenseId)?.[1].get('topup_offered') ?? 0)),
    0,
  );
  const purchased = results.reduce((s, r) => s + r.topupsPurchased, 0);
  if (offered > 0) {
    const conv = (purchased / offered) * 100;
    if (conv < 30) {
      findings.push({
        id: nextId(),
        severity: conv < 10 ? 'high' : 'medium',
        category: 'ux',
        title: `Topup conversion ${conv.toFixed(1)}% — most users abandon when the battery hits zero`,
        evidence: `${purchased} topups purchased / ${offered} topup_offered events across ${results.length} licenses`,
        recommendation:
          'Investigate the empty-battery flow: surface the topup prompt earlier (>50 cr remaining), preview the topup pack pricing before checkout, and offer a one-click upgrade-instead-of-topup path. Consider auto-topup as an opt-in.',
      });
    }
  }

  // ---- Invariant findings ----
  const violations = metrics.violationsReport();
  if (violations.length > 0) {
    const byKind = violations.reduce<Record<string, number>>((acc, v) => {
      acc[v.kind] = (acc[v.kind] ?? 0) + 1;
      return acc;
    }, {});
    findings.push({
      id: nextId(),
      severity: 'critical',
      category: 'invariant',
      title: `${violations.length} accounting invariant violation(s) detected`,
      evidence: `By kind: ${JSON.stringify(byKind)}. See violations.csv for per-license detail.`,
      recommendation:
        'Treat as a billing correctness bug. Reproduce against the affected tenants, add a regression test in packages/db/src/billing.test.ts, fix billing.debit/topup atomicity.',
    });
  }

  // ---- Mobile vs desktop divergence ----
  const totalMobile = results.reduce((s, r) => s + r.mobileMessages, 0);
  const totalDesktop = results.reduce((s, r) => s + r.desktopMessages, 0);
  const totalMsgs = totalMobile + totalDesktop;
  if (totalMsgs > 0) {
    const mobilePct = (totalMobile / totalMsgs) * 100;
    const expectedMobilePct = cfg.deviceSplit.mobile * 100;
    const deviation = Math.abs(mobilePct - expectedMobilePct);
    if (deviation > 5) {
      findings.push({
        id: nextId(),
        severity: 'low',
        category: 'config',
        title: `Mobile message share ${mobilePct.toFixed(1)}% diverges from the ${expectedMobilePct.toFixed(0)}% target by ${deviation.toFixed(1)}pp`,
        evidence: `${totalMobile.toLocaleString()} mobile · ${totalDesktop.toLocaleString()} desktop messages`,
        recommendation:
          'Adjust messagesPerSession.{mobile,desktop} in scripts/sim/src/config.ts so the per-user cadence aligns with the device-split target.',
      });
    }
  }

  // ---- Render ----
  const lines: string[] = [];
  lines.push(`# KitZ Tool Audit — ${results.length} licenses × ${cfg.days} days`);
  lines.push('');
  lines.push(
    `**Run:** ${startedAt.toISOString()} → ${finishedAt.toISOString()} ` +
      `(${Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000)}s)`,
  );
  lines.push(`**Seed:** ${cfg.seed} · **Concurrency:** ${cfg.concurrency} · **Base:** ${cfg.baseUrl}`);
  lines.push('');

  // Headline numbers
  const totalRev = economics.reduce((s, e) => s + e.total_revenue_cents, 0);
  const totalAi = economics.reduce((s, e) => s + e.ai_cost_cents, 0);
  const totalStripe = economics.reduce((s, e) => s + e.stripe_fees_cents, 0);
  const totalMargin = economics.reduce((s, e) => s + e.gross_margin_cents, 0);
  const totalUsers = results.reduce((s, r) => s + r.userCount, 0);
  const totalDebited = results.reduce((s, r) => s + r.totalMessagesDebited, 0);
  const totalTopups = results.reduce((s, r) => s + r.topupsPurchased, 0);

  lines.push('## Headline');
  lines.push('');
  lines.push(`- **Onboarding completion:** ${onboardPct.toFixed(1)}% (${onboardedCount}/${results.length})`);
  lines.push(`- **Total simulated users:** ${totalUsers.toLocaleString()}`);
  lines.push(`- **Total chat messages:** ${totalDebited.toLocaleString()}`);
  lines.push(`- **Total topups purchased:** ${totalTopups.toLocaleString()}`);
  lines.push(`- **Revenue (90d):** $${(totalRev / 100).toLocaleString()}`);
  lines.push(`- **AI cost (90d):** $${(totalAi / 100).toLocaleString()}`);
  lines.push(`- **Stripe fees (90d):** $${(totalStripe / 100).toLocaleString()}`);
  lines.push(`- **Gross margin (90d):** $${(totalMargin / 100).toLocaleString()} (${totalRev > 0 ? ((totalMargin / totalRev) * 100).toFixed(1) : '0.0'}%)`);
  lines.push(`- **Findings:** ${findings.length}`);
  lines.push('');

  // Per-plan economics
  lines.push('## Economics by plan');
  lines.push('');
  lines.push('| Plan | Licenses | Msgs | Plan rev | Topup rev | AI cost | Stripe | Gross margin | Margin % |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const e of economics) {
    lines.push(
      `| ${e.plan} | ${e.licenses} | ${e.total_msgs.toLocaleString()} | $${(e.plan_revenue_cents / 100).toFixed(0)} | $${(e.topup_revenue_cents / 100).toFixed(0)} | $${(e.ai_cost_cents / 100).toFixed(2)} | $${(e.stripe_fees_cents / 100).toFixed(2)} | $${(e.gross_margin_cents / 100).toFixed(2)} | ${e.gross_margin_pct.toFixed(1)}% |`,
    );
  }
  lines.push('');

  // Findings
  lines.push('## Findings');
  lines.push('');
  if (findings.length === 0) {
    lines.push('_No findings — every threshold passed. Tool looks healthy at this scale + config._');
  } else {
    const order: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
    findings.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
    for (const f of findings) {
      lines.push(`### ${f.id} · ${severityBadge(f.severity)} · [${f.category}] ${f.title}`);
      lines.push('');
      lines.push(`**Evidence.** ${f.evidence}`);
      lines.push('');
      lines.push(`**Recommendation.** ${f.recommendation}`);
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');
  lines.push('## Files');
  lines.push('');
  lines.push('- `latency.csv` — per-endpoint p50/p95/p99 + error rate');
  lines.push('- `status-codes.csv` — per-endpoint status-code matrix');
  lines.push('- `licenses.csv` — per-license accounting (revenue, topups, debits, balance)');
  lines.push('- `funnel.csv` — funnel events globally and by plan');
  lines.push('- `device-split.csv` — mobile vs desktop totals');
  lines.push('- `economics.csv` — per-plan revenue / AI cost / margin');
  lines.push('- `violations.csv` — invariant violations (empty = clean)');
  lines.push('');

  writeFileSync(join(outDir, 'findings.md'), lines.join('\n'));
}

function severityBadge(s: Severity): string {
  switch (s) {
    case 'critical':
      return '🟥 CRITICAL';
    case 'high':
      return '🟧 HIGH';
    case 'medium':
      return '🟨 MEDIUM';
    case 'low':
      return '⬜ LOW';
    case 'info':
      return 'ℹ️ INFO';
  }
}
