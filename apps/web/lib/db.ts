import { createDbClient, type DbClient } from '@kitz/db';

/**
 * Process-wide singleton DbClient.
 *
 * In Next.js dev, route files are re-evaluated on each compile, which would
 * wipe an ordinary module-level `let`. Stash the instance on `globalThis`
 * so state survives HMR and matches production behaviour (one stub = one
 * in-memory store for the lifetime of the dev server).
 *
 * Restarting the dev server clears state — as expected for the stub.
 */
const globalKey = Symbol.for('kitz.db');

type GlobalWithDb = typeof globalThis & {
  [globalKey]?: DbClient;
};

const g = globalThis as GlobalWithDb;

export function getDb(): DbClient {
  if (!g[globalKey]) {
    g[globalKey] = createDbClient(process.env);
  }
  return g[globalKey];
}
