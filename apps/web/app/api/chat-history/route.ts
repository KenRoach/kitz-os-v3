/**
 * Chat history API.
 *
 * GET    /api/chat-history              → last 500 messages for (tenant, user)
 * POST   /api/chat-history { role, text, fromDevice } → append one
 * DELETE /api/chat-history              → clear thread
 *
 * Cross-device: every append emits a `chat.message` SSE event so the
 * other device can re-fetch (or merge just the new turn). We keep
 * the event payload small — role + preview + fromDevice — so the
 * stream doesn't carry full conversation bodies.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiEnvelope } from '@kitz/types';
import { requireTenant } from '@/lib/auth/require-tenant';
import { chatHistoryStore, type ChatMessage } from '@/lib/chat-history/store';
import { eventBus } from '@/lib/stream/bus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const postSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  text: z.string().trim().min(1).max(20_000),
  fromDevice: z.enum(['desktop', 'mobile', 'system']).default('desktop'),
});

export async function GET(): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }
  const items = chatHistoryStore.list(auth.ctx.tenantId, auth.ctx.userId);
  const body: ApiEnvelope<{ items: ChatMessage[] }> = {
    success: true,
    data: { items },
    error: null,
  };
  return NextResponse.json(body, { status: 200 });
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }
  let parsed: z.infer<typeof postSchema>;
  try {
    parsed = postSchema.parse(await request.json());
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'invalid_body' };
    return NextResponse.json(body, { status: 400 });
  }

  const msg = chatHistoryStore.append(auth.ctx.tenantId, auth.ctx.userId, {
    role: parsed.role,
    text: parsed.text,
    fromDevice: parsed.fromDevice,
  });

  // Skip the broadcast for system messages — those are typically
  // hydrated server-side and don't need to ping devices.
  if (parsed.role !== 'system' && parsed.fromDevice !== 'system') {
    eventBus.emit(auth.ctx.tenantId, {
      kind: 'chat.message',
      role: parsed.role,
      preview: parsed.text.slice(0, 140),
      fromDevice: parsed.fromDevice,
      at: msg.createdAt,
    });
  }

  const body: ApiEnvelope<ChatMessage> = { success: true, data: msg, error: null };
  return NextResponse.json(body, { status: 200 });
}

export async function DELETE(): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }
  chatHistoryStore.clear(auth.ctx.tenantId, auth.ctx.userId);
  const body: ApiEnvelope<{ ok: true }> = {
    success: true,
    data: { ok: true },
    error: null,
  };
  return NextResponse.json(body, { status: 200 });
}
