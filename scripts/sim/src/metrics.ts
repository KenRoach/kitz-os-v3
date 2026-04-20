/**
 * Audit-grade metrics collector.
 *
 * We capture four orthogonal axes from a single sim run:
 *   1. Latency histogram per endpoint (p50/p95/p99)
 *   2. Error rate per endpoint
 *   3. Funnel events (signup_started, otp_verified, onboarded, first_chat,
 *      hit_402, topup_offered, topup_purchased, abandoned)
 *   4. Invariant violations (debit > balance, ledger sum != balance, etc.)
 *
 * All counters are local to the simulator process; nothing leaks back into
 * the app being audited. Output is consumed by report.ts.
 */

export type EndpointKey = string; // e.g. "POST /api/auth/otp"

export type LatencySample = {
  endpoint: EndpointKey;
  ms: number;
  status: number;
  ok: boolean;
};

export type FunnelEvent =
  | 'signup_started'
  | 'otp_requested'
  | 'otp_verified'
  | 'onboarded'
  | 'mode_switched_live'
  | 'first_chat_attempted'
  | 'first_chat_debited'
  | 'hit_insufficient_credits'
  | 'topup_offered'
  | 'topup_purchased'
  | 'topup_abandoned'
  | 'plan_upgraded'
  | 'plan_downgraded'
  | 'abandoned_session';

export type InvariantViolation = {
  kind: string;
  detail: string;
  licenseId: string;
  userId?: string;
};

export class Metrics {
  private latencies = new Map<EndpointKey, number[]>();
  private statusCounts = new Map<EndpointKey, Map<number, number>>();
  private funnel = new Map<FunnelEvent, number>();
  /** Per-license per-event funnel hits — for funnel-by-plan analysis. */
  private funnelByLicense = new Map<string, Map<FunnelEvent, number>>();
  private violations: InvariantViolation[] = [];

  recordLatency(s: LatencySample): void {
    const arr = this.latencies.get(s.endpoint) ?? [];
    arr.push(s.ms);
    this.latencies.set(s.endpoint, arr);
    const byStatus = this.statusCounts.get(s.endpoint) ?? new Map<number, number>();
    byStatus.set(s.status, (byStatus.get(s.status) ?? 0) + 1);
    this.statusCounts.set(s.endpoint, byStatus);
  }

  recordEvent(licenseId: string, event: FunnelEvent): void {
    this.funnel.set(event, (this.funnel.get(event) ?? 0) + 1);
    const m = this.funnelByLicense.get(licenseId) ?? new Map();
    m.set(event, (m.get(event) ?? 0) + 1);
    this.funnelByLicense.set(licenseId, m);
  }

  recordViolation(v: InvariantViolation): void {
    this.violations.push(v);
  }

  /** Latency percentiles per endpoint. */
  latencyReport(): Array<{
    endpoint: EndpointKey;
    count: number;
    p50: number;
    p95: number;
    p99: number;
    max: number;
    errorRatePct: number;
  }> {
    const out: ReturnType<Metrics['latencyReport']> = [];
    for (const [endpoint, samples] of this.latencies) {
      const sorted = [...samples].sort((a, b) => a - b);
      const pick = (q: number) =>
        sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;
      const byStatus = this.statusCounts.get(endpoint) ?? new Map();
      let errors = 0;
      let total = 0;
      for (const [status, count] of byStatus) {
        total += count;
        if (status >= 400) errors += count;
      }
      out.push({
        endpoint,
        count: sorted.length,
        p50: pick(0.5),
        p95: pick(0.95),
        p99: pick(0.99),
        max: sorted[sorted.length - 1] ?? 0,
        errorRatePct: total > 0 ? (errors / total) * 100 : 0,
      });
    }
    return out.sort((a, b) => b.count - a.count);
  }

  funnelReport(): Record<FunnelEvent, number> {
    const out = {} as Record<FunnelEvent, number>;
    for (const [event, count] of this.funnel) out[event] = count;
    return out;
  }

  funnelByLicenseEntries(): Array<[string, Map<FunnelEvent, number>]> {
    return Array.from(this.funnelByLicense.entries());
  }

  violationsReport(): InvariantViolation[] {
    return this.violations;
  }

  /**
   * Status-code matrix: per endpoint, how many 2xx / 4xx / 5xx.
   * Useful for distinguishing "the chat 502 is expected" from "deals 500
   * is a real bug".
   */
  statusMatrix(): Array<{ endpoint: EndpointKey; codes: Record<number, number> }> {
    const out: ReturnType<Metrics['statusMatrix']> = [];
    for (const [endpoint, byStatus] of this.statusCounts) {
      const codes: Record<number, number> = {};
      for (const [code, count] of byStatus) codes[code] = count;
      out.push({ endpoint, codes });
    }
    return out.sort((a, b) => a.endpoint.localeCompare(b.endpoint));
  }
}
