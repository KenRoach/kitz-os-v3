#!/usr/bin/env -S node --import tsx
/**
 * Audit harness entrypoint.
 *
 * Usage:
 *   pnpm --filter @kitz/sim sim                       # 1001 × 90d defaults
 *   pnpm --filter @kitz/sim sim -- --licenses=5 --days=7
 *   KITZ_BASE_URL=https://staging.example.com pnpm --filter @kitz/sim sim
 */

import { mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CONFIG, type SimConfig } from './config';

// Anchor outputs to the @kitz/sim package dir, regardless of cwd. pnpm
// runs scripts with cwd=package, but if invoked from the repo root the
// nested `scripts/sim/` would otherwise duplicate.
const __filename = fileURLToPath(import.meta.url);
const PKG_ROOT = resolve(dirname(__filename), '..');
import { Metrics } from './metrics';
import { makeRng } from './rng';
import { generateLicenseProfiles, runAll, type LicenseResult } from './simulator';
import { writeReport } from './report';

function parseArgs(argv: string[]): Partial<SimConfig> {
  const out: Partial<SimConfig> = {};
  for (const arg of argv) {
    const m = arg.match(/^--([a-zA-Z]+)=(.+)$/);
    if (!m) continue;
    const [, key, raw] = m;
    if (key === 'licenses') out.licenses = Number(raw);
    else if (key === 'days') out.days = Number(raw);
    else if (key === 'seed') out.seed = Number(raw);
    else if (key === 'concurrency') out.concurrency = Number(raw);
    else if (key === 'baseUrl') out.baseUrl = String(raw);
  }
  return out;
}

async function main(): Promise<void> {
  const cfg: SimConfig = { ...DEFAULT_CONFIG, ...parseArgs(process.argv.slice(2)) };
  const startedAt = new Date();
  const runId = `run-${startedAt.toISOString().replace(/[:.]/g, '-')}`;
  const outDir = join(PKG_ROOT, 'out', runId);
  mkdirSync(outDir, { recursive: true });

  console.log(`[sim] starting · ${cfg.licenses} licenses × ${cfg.days} days · seed=${cfg.seed}`);
  console.log(`[sim] base=${cfg.baseUrl} · concurrency=${cfg.concurrency}`);
  console.log(`[sim] out=${outDir}`);

  // Probe the base URL before spending real CPU on the sim
  try {
    const probe = await fetch(`${cfg.baseUrl}/api/ai-health`, { method: 'GET' });
    console.log(`[sim] probe ${cfg.baseUrl}/api/ai-health → ${probe.status}`);
  } catch (err) {
    console.error(`[sim] FATAL — base URL unreachable: ${(err as Error).message}`);
    console.error(`[sim] start the dev server: pnpm --filter @kitz/web dev`);
    process.exit(2);
  }

  const metrics = new Metrics();
  const rng = makeRng(cfg.seed);
  const profiles = await generateLicenseProfiles(cfg, rng);

  const results: LicenseResult[] = [];
  let lastLog = Date.now();
  for await (const r of runAll({
    cfg,
    metrics,
    profiles,
    seed: cfg.seed,
    onProgress: (done, total) => {
      const now = Date.now();
      if (now - lastLog > 2000 || done === total) {
        const pct = ((done / total) * 100).toFixed(1);
        console.log(`[sim] ${done}/${total} (${pct}%)`);
        lastLog = now;
      }
    },
  })) {
    results.push(r);
  }

  const finishedAt = new Date();
  console.log(
    `[sim] done in ${Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000)}s · writing report…`,
  );

  writeReport({ cfg, metrics, results, startedAt, finishedAt, outDir });

  console.log(`[sim] report written to ${outDir}`);
  console.log(`[sim] open: ${join(outDir, 'findings.md')}`);
}

main().catch((err) => {
  console.error('[sim] FATAL', err);
  process.exit(1);
});
