import { createDbClient, type DbClient } from '@kitz/db';

/**
 * Singleton DbClient for the web app.
 *
 * In dev (no Supabase env) this is the in-memory stub — restarting the
 * Next.js dev server clears state. Tests get their own stub per suite.
 */
let cached: DbClient | null = null;

export function getDb(): DbClient {
  if (!cached) cached = createDbClient(process.env);
  return cached;
}
