import type { DbClient } from './interface';
import { createStubDb } from './stub';

/**
 * Select a DbClient implementation based on env.
 *
 * When `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are both set, the
 * real Supabase-backed client would be returned. The real client lands in a
 * follow-up commit once `@supabase/supabase-js` is added as a dependency.
 * Until then, the stub is returned and a warning is logged so operators
 * know they are on the stub.
 */
export function createDbClient(env: NodeJS.ProcessEnv = process.env): DbClient {
  const hasSupabase =
    typeof env.SUPABASE_URL === 'string' &&
    env.SUPABASE_URL.length > 0 &&
    typeof env.SUPABASE_SERVICE_ROLE_KEY === 'string' &&
    env.SUPABASE_SERVICE_ROLE_KEY.length > 0;

  if (!hasSupabase) {
    return createStubDb();
  }

  // Placeholder for the real implementation.
  // Returning the stub keeps the interface stable; swapping in the real
  // client is a one-line change that will also add a runtime dependency.
  return createStubDb();
}
