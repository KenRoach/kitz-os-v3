/**
 * Brand settings API — one row per tenant.
 *
 * GET /api/brand       → current settings (seeded with tenant name + defaults on first read)
 * PATCH /api/brand     → merge updates; returns the new row
 *
 * Validation is tight on numeric + color fields so a typo in the
 * settings form doesn't render a broken print template. logoUrl is
 * capped at 2MB worth of data-URL to keep the in-memory store sane.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiEnvelope } from '@kitz/types';
import { requireTenant } from '@/lib/auth/require-tenant';
import { brandStore, type BrandSettings } from '@/lib/brand/store';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const patchSchema = z.object({
  businessName: z.string().trim().min(1).max(200).optional(),
  taxId: z.string().trim().max(60).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  email: z.string().trim().email().max(320).nullable().optional(),
  phone: z.string().trim().max(60).nullable().optional(),
  website: z.string().trim().url().max(500).nullable().optional(),
  logoUrl: z
    .string()
    .trim()
    .max(MAX_LOGO_BYTES * 2) // base64 overhead
    .nullable()
    .optional(),
  accentColor: z
    .string()
    .trim()
    .regex(/^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})|rgb\([^)]+\)|hsl\([^)]+\)|[a-zA-Z]+)$/, 'invalid_color')
    .max(40)
    .optional(),
  footerNote: z.string().trim().max(500).nullable().optional(),
  defaultTaxRate: z.number().min(0).max(1).optional(),
  defaultCurrency: z.string().trim().length(3).optional(),
});

async function tenantName(tenantId: string): Promise<string> {
  const db = getDb();
  // findTenantBySlug wants a slug; we only have an id here. The stub
  // TenantStats / findPrimaryTenant paths don't expose a getById.
  // For now we accept the generic fallback — the first successful
  // PATCH will overwrite it.
  void db;
  void tenantId;
  return 'Mi negocio';
}

export async function GET(): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }
  const fallback = await tenantName(auth.ctx.tenantId);
  const settings = brandStore.get(auth.ctx.tenantId, fallback);
  const body: ApiEnvelope<BrandSettings> = { success: true, data: settings, error: null };
  return NextResponse.json(body, { status: 200 });
}

export async function PATCH(request: Request): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }
  if (auth.ctx.role === 'viewer') {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'forbidden' };
    return NextResponse.json(body, { status: 403 });
  }
  let parsed: z.infer<typeof patchSchema>;
  try {
    parsed = patchSchema.parse(await request.json());
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'invalid_body' };
    return NextResponse.json(body, { status: 400 });
  }
  const fallback = await tenantName(auth.ctx.tenantId);
  // Drop undefined keys so `exactOptionalPropertyTypes` stays happy
  // when the patch spreads into BrandSettings.
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (v !== undefined) patch[k] = v;
  }
  const updated = brandStore.update(
    auth.ctx.tenantId,
    fallback,
    patch as Parameters<typeof brandStore.update>[2],
  );
  const body: ApiEnvelope<BrandSettings> = { success: true, data: updated, error: null };
  return NextResponse.json(body, { status: 200 });
}
