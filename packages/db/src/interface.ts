import type { AuthOtpRecord, AuthSession, Tenant, UserProfile, WorkspaceMember } from './types';
import type { UserRole } from '@kitz/types';

export type TenantStats = {
  contacts: number;
  deals: number;
  conversations: number;
  agents: number;
  credits: {
    balance: number;
    lifetimeTopup: number;
  };
};

export type ActivityEvent = {
  id: string;
  tenant_id: string;
  actor: string;
  action: string;
  entity: string;
  created_at: string;
};

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

  // Users
  findUserByEmail(email: string): Promise<UserProfile | null>;
  createUser(input: { email: string; locale?: 'es' | 'en' | 'pt' }): Promise<UserProfile>;
  updateUserProfile(
    userId: string,
    patch: Partial<Pick<UserProfile, 'full_name' | 'avatar_url' | 'locale'>>,
  ): Promise<UserProfile>;

  // Tenants + membership
  findPrimaryTenant(
    userId: string,
  ): Promise<{ tenant: Tenant; membership: WorkspaceMember } | null>;
  findTenantBySlug(slug: string): Promise<Tenant | null>;
  createTenantWithOwner(input: {
    slug: string;
    name: string;
    ownerUserId: string;
    role?: UserRole;
  }): Promise<{ tenant: Tenant; membership: WorkspaceMember }>;

  // Dashboard
  getTenantStats(tenantId: string): Promise<TenantStats>;
  listRecentActivity(tenantId: string, limit?: number): Promise<ActivityEvent[]>;
  recordActivity(input: {
    tenantId: string;
    actor: string;
    action: string;
    entity: string;
  }): Promise<ActivityEvent>;

  // Session
  createSession(userId: string, email: string): Promise<AuthSession & { token: string }>;
  findSessionByToken(token: string): Promise<AuthSession | null>;
  revokeSession(token: string): Promise<void>;
}
