/**
 * POST /api/image/generate — server-side proxy to OpenAI image gen.
 *
 * Uses OpenAI's `/v1/images/generations` (gpt-image-1 / dall-e-3) so
 * the API key stays out of the browser. Returns the generated image
 * as a base64 data URL the chat renderer can render inline.
 *
 * Body: { prompt: string; size?: '1024x1024'|'1024x1792'|'1792x1024'; quality?: 'standard'|'hd' }
 * Response: { url: string; revised_prompt?: string } as data URL
 *
 * Fallback: 503 with body 'openai_not_configured' if OPENAI_API_KEY
 * is missing — chat shell renders a "Image gen not configured" hint
 * instead of crashing.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiEnvelope } from '@kitz/types';
import { requireTenant } from '@/lib/auth/require-tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  prompt: z.string().trim().min(3).max(2000),
  size: z.enum(['1024x1024', '1024x1792', '1792x1024']).optional(),
  quality: z.enum(['standard', 'hd']).optional(),
  model: z.enum(['gpt-image-1', 'dall-e-3']).optional(),
});

const DEFAULT_MODEL = process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1';

export async function POST(request: Request): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }
  if (auth.ctx.role === 'viewer') {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'forbidden' };
    return NextResponse.json(body, { status: 403 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'invalid_body' };
    return NextResponse.json(body, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const body: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: 'openai_not_configured',
    };
    return NextResponse.json(body, { status: 503 });
  }

  const model = parsed.model ?? DEFAULT_MODEL;
  const size = parsed.size ?? '1024x1024';

  try {
    const upstream = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: parsed.prompt,
        n: 1,
        size,
        // gpt-image-1 always returns b64; dall-e-3 needs the explicit hint
        response_format: 'b64_json',
        ...(model === 'dall-e-3' ? { quality: parsed.quality ?? 'standard' } : {}),
      }),
      cache: 'no-store',
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      const body: ApiEnvelope<null> = {
        success: false,
        data: null,
        error: `openai_upstream_${upstream.status}: ${detail.slice(0, 240)}`,
      };
      return NextResponse.json(body, { status: 502 });
    }

    const json = (await upstream.json()) as {
      data?: { b64_json?: string; url?: string; revised_prompt?: string }[];
    };
    const first = json.data?.[0];
    if (!first?.b64_json) {
      const body: ApiEnvelope<null> = {
        success: false,
        data: null,
        error: 'openai_no_image_returned',
      };
      return NextResponse.json(body, { status: 502 });
    }

    const dataUrl = `data:image/png;base64,${first.b64_json}`;
    const body: ApiEnvelope<{ url: string; revised_prompt?: string }> = {
      success: true,
      data: {
        url: dataUrl,
        ...(first.revised_prompt ? { revised_prompt: first.revised_prompt } : {}),
      },
      error: null,
    };
    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    const body: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: `openai_network_error: ${(err as Error).message}`,
    };
    return NextResponse.json(body, { status: 502 });
  }
}
