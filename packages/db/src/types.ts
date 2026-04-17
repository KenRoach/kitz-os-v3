import type { UserRole } from '@kitz/types';

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  settings: Record<string, unknown>;
  created_at: string;
};

export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  locale: 'es' | 'en' | 'pt';
  created_at: string;
};

export type WorkspaceMember = {
  id: string;
  tenant_id: string;
  user_id: string;
  role: UserRole;
  invited_by: string | null;
  joined_at: string;
};

export type AuthOtpRecord = {
  id: string;
  email: string;
  code_hash: string;
  expires_at: string;
  attempts: number;
  consumed_at: string | null;
  created_at: string;
};

export type AuthSession = {
  user_id: string;
  email: string;
  expires_at: string;
};
