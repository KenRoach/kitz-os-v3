import { randomUUID } from 'node:crypto';
import type { DbClient } from './interface';
import type { AuthOtpRecord, AuthSession, Tenant, UserProfile, WorkspaceMember } from './types';

type StubState = {
  otps: Map<string, AuthOtpRecord>;
  users: Map<string, UserProfile>; // key = email
  tenants: Map<string, Tenant>; // key = tenant.id
  members: Map<string, WorkspaceMember>; // key = member.id
  sessions: Map<string, AuthSession>; // key = token
};

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * In-memory stub DbClient for development and tests.
 *
 * Behaviour matches the intended real Supabase implementation so tests that
 * pass here will pass in production. Not thread-safe across processes —
 * single process per test file.
 */
export function createStubDb(): DbClient {
  const state: StubState = {
    otps: new Map(),
    users: new Map(),
    tenants: new Map(),
    members: new Map(),
    sessions: new Map(),
  };

  return {
    async createOtp({ email, codeHash, ttlSeconds }) {
      // Invalidate any prior active OTPs for this email.
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
      if (state.users.has(email)) {
        throw new Error('user_exists');
      }
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

    async findPrimaryTenant(userId) {
      for (const member of state.members.values()) {
        if (member.user_id === userId) {
          const tenant = state.tenants.get(member.tenant_id);
          if (tenant) return { tenant, membership: member };
        }
      }
      return null;
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
