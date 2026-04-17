import { randomUUID } from 'node:crypto';
import type { DbClient, ActivityEvent } from './interface';
import type { AuthOtpRecord, AuthSession, Tenant, UserProfile, WorkspaceMember } from './types';
import type { UserRole } from '@kitz/types';

const DEFAULT_FREE_CREDITS = 100;

type StubState = {
  otps: Map<string, AuthOtpRecord>;
  users: Map<string, UserProfile>;
  tenants: Map<string, Tenant>;
  members: Map<string, WorkspaceMember>;
  sessions: Map<string, AuthSession>;
  activity: ActivityEvent[];
  credits: Map<string, { balance: number; lifetimeTopup: number }>;
};

function nowIso(): string {
  return new Date().toISOString();
}

export function createStubDb(): DbClient {
  const state: StubState = {
    otps: new Map(),
    users: new Map(),
    tenants: new Map(),
    members: new Map(),
    sessions: new Map(),
    activity: [],
    credits: new Map(),
  };

  return {
    async createOtp({ email, codeHash, ttlSeconds }) {
      for (const otp of state.otps.values()) {
        if (otp.email === email && !otp.consumed_at) {
          otp.consumed_at = nowIso();
        }
      }
      const record: AuthOtpRecord = {
        id: randomUUID(),
        email,
        code_hash: codeHash,
        expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
        attempts: 0,
        consumed_at: null,
        created_at: nowIso(),
      };
      state.otps.set(record.id, record);
      return record;
    },

    async findActiveOtp(email) {
      const now = Date.now();
      for (const otp of state.otps.values()) {
        if (otp.email === email && !otp.consumed_at && new Date(otp.expires_at).getTime() > now) {
          return otp;
        }
      }
      return null;
    },

    async incrementOtpAttempts(id) {
      const otp = state.otps.get(id);
      if (!otp) throw new Error('otp_not_found');
      otp.attempts += 1;
      return otp.attempts;
    },

    async consumeOtp(id) {
      const otp = state.otps.get(id);
      if (!otp) throw new Error('otp_not_found');
      otp.consumed_at = nowIso();
    },

    async findUserByEmail(email) {
      return state.users.get(email) ?? null;
    },

    async createUser({ email, locale = 'es' }) {
      if (state.users.has(email)) throw new Error('user_exists');
      const profile: UserProfile = {
        id: randomUUID(),
        email,
        full_name: null,
        avatar_url: null,
        locale,
        created_at: nowIso(),
      };
      state.users.set(email, profile);
      return profile;
    },

    async updateUserProfile(userId, patch) {
      for (const [email, profile] of state.users.entries()) {
        if (profile.id === userId) {
          const updated: UserProfile = {
            ...profile,
            full_name: patch.full_name ?? profile.full_name,
            avatar_url: patch.avatar_url ?? profile.avatar_url,
            locale: patch.locale ?? profile.locale,
          };
          state.users.set(email, updated);
          return updated;
        }
      }
      throw new Error('user_not_found');
    },

    async findPrimaryTenant(userId) {
      for (const member of state.members.values()) {
        if (member.user_id === userId) {
          const tenant = state.tenants.get(member.tenant_id);
          if (tenant) return { tenant, membership: member };
        }
      }
      return null;
    },

    async findTenantBySlug(slug) {
      for (const tenant of state.tenants.values()) {
        if (tenant.slug === slug) return tenant;
      }
      return null;
    },

    async createTenantWithOwner({ slug, name, ownerUserId, role }) {
      for (const tenant of state.tenants.values()) {
        if (tenant.slug === slug) throw new Error('slug_taken');
      }
      const finalRole: UserRole = role ?? 'owner';
      const tenant: Tenant = {
        id: randomUUID(),
        slug,
        name,
        plan: 'free',
        settings: {},
        created_at: nowIso(),
      };
      const membership: WorkspaceMember = {
        id: randomUUID(),
        tenant_id: tenant.id,
        user_id: ownerUserId,
        role: finalRole,
        invited_by: null,
        joined_at: nowIso(),
      };
      state.tenants.set(tenant.id, tenant);
      state.members.set(membership.id, membership);
      state.credits.set(tenant.id, {
        balance: DEFAULT_FREE_CREDITS,
        lifetimeTopup: DEFAULT_FREE_CREDITS,
      });
      state.activity.unshift({
        id: randomUUID(),
        tenant_id: tenant.id,
        actor: ownerUserId,
        action: 'created_workspace',
        entity: tenant.slug,
        created_at: nowIso(),
      });
      return { tenant, membership };
    },

    async getTenantStats(tenantId) {
      const credits = state.credits.get(tenantId) ?? {
        balance: 0,
        lifetimeTopup: 0,
      };
      return {
        contacts: 0,
        deals: 0,
        conversations: 0,
        agents: 0,
        credits,
      };
    },

    async listRecentActivity(tenantId, limit = 20) {
      return state.activity.filter((a) => a.tenant_id === tenantId).slice(0, limit);
    },

    async recordActivity({ tenantId, actor, action, entity }) {
      const event: ActivityEvent = {
        id: randomUUID(),
        tenant_id: tenantId,
        actor,
        action,
        entity,
        created_at: nowIso(),
      };
      state.activity.unshift(event);
      return event;
    },

    async createSession(userId, email) {
      const token = randomUUID();
      const session: AuthSession = {
        user_id: userId,
        email,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      };
      state.sessions.set(token, session);
      return { ...session, token };
    },

    async findSessionByToken(token) {
      const session = state.sessions.get(token);
      if (!session) return null;
      if (new Date(session.expires_at).getTime() < Date.now()) {
        state.sessions.delete(token);
        return null;
      }
      return session;
    },

    async revokeSession(token) {
      state.sessions.delete(token);
    },
  };
}
