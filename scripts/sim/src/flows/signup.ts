import type { Client } from '../client';
import type { Metrics } from '../metrics';
import type { PlanId, WorkPack } from '../config';

export type SignupResult =
  | {
      ok: true;
      userId: string;
      next: string;
      onboarded: boolean;
    }
  | {
      ok: false;
      stage: 'otp' | 'verify' | 'onboard';
      reason: string;
    };

type OtpResp = { success: boolean; data: { devCode?: string } | null; error: string | null };
type VerifyResp = {
  success: boolean;
  data: { userId: string; next: string } | null;
  error: string | null;
};
type OnboardResp = {
  success: boolean;
  data: { tenantId: string; slug: string } | null;
  error: string | null;
};
type ModeResp = {
  success: boolean;
  data: { mode: string; activeSlug: string } | null;
  error: string | null;
};

export async function signupAndOnboard(opts: {
  client: Client;
  metrics: Metrics;
  licenseId: string;
  email: string;
  fullName: string;
  workspaceName: string;
  preferredSlug: string;
  workPack: WorkPack;
  plan: PlanId;
}): Promise<SignupResult> {
  const { client, metrics, licenseId, email, fullName, workspaceName, preferredSlug, workPack, plan } = opts;
  metrics.recordEvent(licenseId, 'signup_started');

  // 1. Request OTP
  metrics.recordEvent(licenseId, 'otp_requested');
  const otp = await client.request<OtpResp>('POST', '/api/auth/otp', { email });
  if (!otp.ok || !otp.body?.success) {
    return { ok: false, stage: 'otp', reason: otp.body?.error ?? `http_${otp.status}` };
  }
  const code = otp.body.data?.devCode;
  if (!code) {
    return { ok: false, stage: 'otp', reason: 'no_dev_code' };
  }

  // 2. Verify OTP
  const verify = await client.request<VerifyResp>('POST', '/api/auth/verify', {
    email,
    code,
  });
  if (!verify.ok || !verify.body?.success || !verify.body.data) {
    return { ok: false, stage: 'verify', reason: verify.body?.error ?? `http_${verify.status}` };
  }
  metrics.recordEvent(licenseId, 'otp_verified');
  const { userId, next } = verify.body.data;

  // 3. Onboard if next === '/onboarding'
  let onboarded = false;
  if (next === '/onboarding') {
    const onboard = await client.request<OnboardResp>('POST', '/api/onboarding', {
      workspaceName,
      fullName,
      preferredSlug,
      workPack,
    });
    if (!onboard.ok || !onboard.body?.success) {
      return { ok: false, stage: 'onboard', reason: onboard.body?.error ?? `http_${onboard.status}` };
    }
    onboarded = true;
    metrics.recordEvent(licenseId, 'onboarded');
  } else {
    onboarded = true; // already had a tenant
  }

  // 4. Paid plans switch to live tenant for the rest of the simulation —
  // free plans stay in the seeded sandbox so the demo data is exercised.
  if (plan !== 'free') {
    const mode = await client.request<ModeResp>('POST', '/api/workspace/mode', {
      mode: 'live',
    });
    if (mode.ok && mode.body?.success) {
      metrics.recordEvent(licenseId, 'mode_switched_live');
    }
  }

  return { ok: true, userId, next, onboarded };
}
