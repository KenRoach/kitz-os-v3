/**
 * @kitz/db — database provider interface + stub + real factory.
 *
 * Both apps (web, ai-runtime) depend only on the DbClient interface.
 * A concrete provider (stub for dev/tests, real for production) is selected
 * at process start via `createDbClient(env)`.
 */

export * from './types';
export * from './interface';
export type { Contact, ContactInput, ContactPatch, ContactsStore } from './contacts';
export { createStubDb } from './stub';
export { createDbClient } from './factory';
