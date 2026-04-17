import type { AuthOtpRecord, AuthSession, Tenant, UserProfile, WorkspaceMember } from './types';

/**
 * Narrow, testable database surface.
 *
 * Both the stub and the real Supabase implementation satisfy this interface.
 * New modules should add methods here rather than importing Supabase types
 * directly into application code.
 */
export interface DbClient {
  // OTP
  createOtp(input: { email: string; codeHash: string; ttlSeconds: number }): Promise<AuthOtpRecord>;
  findActiveOtp(email: string): Promise<AuthOtpRecord | null>;
  incrementOtpAttempts(id: string): Promise<number>;
  consumeOtp(id: string): Promise<void>;

  // Users + tenants
  findUserByEmail(email: string): Promise<UserProfile | null>;
  createUser(input: { email: string; locale?: 'es' | 'en' | 'pt' }): Promise<UserProfile>;
  findPrimaryTenant(
    userId: string,
  ): Promise<{ tenant: Tenant; membership: WorkspaceMember } | null>;

  // Session (opaque to callers — stub returns an in-memory token)
  createSession(userId: string, email: string): Promise<AuthSession & { token: string }>;
  findSessionByToken(token: string): Promise<AuthSession | null>;
  revokeSession(token: string): Promise<void>;
}
