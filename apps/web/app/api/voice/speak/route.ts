/**
 * POST /api/voice/speak — server-side proxy to ElevenLabs TTS.
 *
 * Body: { text: string; voiceId?: string; modelId?: string }
 * Response: audio/mpeg bytes (or 502 fallback signal)
 *
 * Why server-side proxy:
 *   - ELEVENLABS_API_KEY stays out of the browser bundle
 *   - Lets us cap text length and rate-limit per tenant
 *   - Lets us debit credits for voice spend later (currently free)
 *
 * Fallback: if no API key is configured, returns 503 with a body
 * the client can detect to fall back to browser SpeechSynthesis.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiEnvelope } from '@kitz/types';
import { requireTenant } from '@/lib/auth/require-tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  text: z.string().trim().min(1).max(4000),
  voiceId: z.string().trim().min(1).max(80).optional(),
  modelId: z.string().trim().min(1).max(80).optional(),
});

const DEFAULT_VOICE_ID =
  process.env.ELEVENLABS_DEFAULT_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM'; // "Rachel" — neutral
const DEFAULT_MODEL_ID = process.env.ELEVENLABS_DEFAULT_MODEL_ID ?? 'eleven_multilingual_v2';

export async function POST(request: Request): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'invalid_body' };
    return NextResponse.json(body, { status: 400 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    // Browser will read this and fall back to SpeechSynthesis.
    return new NextResponse('elevenlabs_not_configured', {
      status: 503,
      headers: { 'content-type': 'text/plain' },
    });
  }

  const voiceId = parsed.voiceId ?? DEFAULT_VOICE_ID;
  const modelId = parsed.modelId ?? DEFAULT_MODEL_ID;

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        method: 'POST',
        headers: {
          accept: 'audio/mpeg',
          'content-type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: parsed.text,
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
        cache: 'no-store',
      },
    );

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      return new NextResponse(`elevenlabs_upstream_${upstream.status}: ${detail.slice(0, 200)}`, {
        status: 502,
        headers: { 'content-type': 'text/plain' },
      });
    }

    // Stream the audio back to the browser.
    const contentType = upstream.headers.get('content-type') ?? 'audio/mpeg';
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'content-type': contentType,
        'cache-control': 'no-store',
      },
    });
  } catch (err) {
    return new NextResponse(`elevenlabs_network_error: ${(err as Error).message}`, {
      status: 502,
      headers: { 'content-type': 'text/plain' },
    });
  }
}
