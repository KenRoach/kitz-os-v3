/**
 * Per-user HTTP client. Maintains its own cookie jar so session +
 * mode cookies stick across calls. Every request is timed and the
 * sample is pushed into the shared Metrics collector.
 */

import { performance } from 'node:perf_hooks';
import type { Metrics } from './metrics';

export type ClientOptions = {
  baseUrl: string;
  metrics: Metrics;
};

export type Cookie = { name: string; value: string };

export type ResponseLite<T> = {
  status: number;
  ok: boolean;
  body: T | null;
  rawText: string;
};

export class Client {
  private cookies = new Map<string, string>();
  constructor(private opts: ClientOptions) {}

  cookieValue(name: string): string | undefined {
    return this.cookies.get(name);
  }

  setCookie(name: string, value: string): void {
    this.cookies.set(name, value);
  }

  private cookieHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  private absorbSetCookie(headers: Headers): void {
    // Fetch's combined Set-Cookie comes back via getSetCookie() in modern Node.
    const raw = (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
    for (const line of raw) {
      const first = line.split(';')[0];
      if (!first) continue;
      const eq = first.indexOf('=');
      if (eq <= 0) continue;
      const name = first.slice(0, eq).trim();
      const value = first.slice(eq + 1).trim();
      if (name) this.cookies.set(name, value);
    }
  }

  async request<T = unknown>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<ResponseLite<T>> {
    const url = `${this.opts.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: {
        'content-type': 'application/json',
        ...(this.cookies.size > 0 ? { cookie: this.cookieHeader() } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    };
    const start = performance.now();
    let status = 0;
    let ok = false;
    let rawText = '';
    let parsed: T | null = null;
    try {
      const res = await fetch(url, init);
      status = res.status;
      ok = res.ok;
      rawText = await res.text();
      this.absorbSetCookie(res.headers);
      try {
        parsed = rawText ? (JSON.parse(rawText) as T) : null;
      } catch {
        parsed = null;
      }
    } catch (err) {
      // Network failure — record as a synthetic 0/false sample.
      const ms = performance.now() - start;
      this.opts.metrics.recordLatency({
        endpoint: `${method} ${path}`,
        ms,
        status: 0,
        ok: false,
      });
      throw err;
    }
    const ms = performance.now() - start;
    this.opts.metrics.recordLatency({
      endpoint: `${method} ${normalizePath(path)}`,
      ms,
      status,
      ok,
    });
    return { status, ok, body: parsed, rawText };
  }
}

/** Collapse dynamic ids in URLs so /api/contacts/abc-123 buckets with /api/contacts/[id]. */
function normalizePath(p: string): string {
  return p
    // UUIDs
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/[id]')
    // Numeric ids
    .replace(/\/\d{2,}/g, '/[id]')
    // Query strings (don't blow up the cardinality)
    .replace(/\?.*$/, '');
}
