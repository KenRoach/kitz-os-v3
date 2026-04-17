import { z } from 'zod';

/**
 * Shared environment variables required by both web and ai-runtime.
 * Validate at process start; fail fast if missing or malformed.
 */
export const sharedEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SERVICE_JWT_SECRET: z.string().min(32, 'SERVICE_JWT_SECRET must be at least 32 characters'),
});

export type SharedEnv = z.infer<typeof sharedEnvSchema>;

export function parseSharedEnv(env: NodeJS.ProcessEnv): SharedEnv {
  const parsed = sharedEnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}
