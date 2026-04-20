/**
 * POST /api/reports/ask — freeform Q&A over the user's operational
 * data. The "Preguntale a tus datos" box on Reportes posts here.
 *
 * Architecture mirrors /api/reports/insight:
 *   1. Validate body (question + bundles)
 *   2. Pre-flight credit debit (3 cr — slightly higher than insight
 *      since the answer is freeform and the LLM does more reasoning)
 *   3. Build a tight prompt: tenant data context + the user question
 *      + JSON output contract
 *   4. Forward to ai-runtime via signServiceJwt
 *   5. Parse JSON; fall back to a deterministic answer when AI is
 *      unreachable so the page stays useful
 *
 * Output contract (parsed from the LLM):
 *   {
 *     answer: string,            // 1-3 paragraph Spanish narrative
 *     chart?: ChartSpec | null,  // optional visualization
 *   }
 *
 * ChartSpec is one of three shapes the existing chart primitives
 * already render (sparkline, bars, funnel). Constraining the LLM
 * to those three keeps validation tight and rendering deterministic.
 *
 * Privacy: the prompt only carries pre-aggregated metrics (already
 * computed client-side and re-validated server-side via the
 * bundle). No raw rows, no PII, no contact details, no message
 * bodies.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { signServiceJwt } from '@kitz/config/jwt';
import type { ApiEnvelope } from '@kitz/types';
import { getDb } from '@/lib/db';
import { requireTenant } from '@/lib/auth/require-tenant';
import type { ReportsBundle } from '@/lib/reports/aggregations';
import type { ExtraBundle } from '@/lib/reports/extra-aggregations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ASK_COST = 3;

const chartSpecSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('sparkline'),
    title: z.string().max(80),
    values: z.array(z.number()).min(1).max(60),
    tone: z.enum(['ink', 'moss', 'danger', 'mute']).optional(),
  }),
  z.object({
    type: z.literal('bars'),
    title: z.string().max(80),
    items: z
      .array(
        z.object({
          label: z.string().max(20),
          value: z.number(),
        }),
      )
      .min(1)
      .max(12),
    tone: z.enum(['ink', 'moss', 'danger', 'mute']).optional(),
  }),
  z.object({
    type: z.literal('funnel'),
    title: z.string().max(80),
    stages: z
      .array(
        z.object({
          label: z.string().max(20),
          count: z.number(),
        }),
      )
      .min(1)
      .max(8),
    tone: z.enum(['ink', 'moss', 'danger', 'mute']).optional(),
  }),
]);

export type ChartSpec = z.infer<typeof chartSpecSchema>;

const bodySchema = z.object({
  question: z.string().trim().min(3).max(500),
  bundle: z.unknown(),
  extra: z.unknown(),
});

function fmtMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString('es')}`;
}

/**
 * Compose a single prompt that gives the LLM everything it needs:
 * the operational data snapshot, the user's question, and the JSON
 * output contract. We ask for a code-fenced JSON block so parsing
 * is trivial and the model has a strong signal about the schema.
 */
function buildPrompt(
  question: string,
  bundle: ReportsBundle,
  extra: ExtraBundle,
): string {
  const lines: string[] = [];
  lines.push(
    'Eres KitZ, asistente de un dueño de negocio en Latinoamérica.',
  );
  lines.push(
    'Responde la pregunta del usuario en español, máximo 3 párrafos cortos. Tono directo, accionable, sin saludos ni jerga corporativa.',
  );
  lines.push(
    'NO inventes números: cita solo los datos del bloque "Datos del periodo". Si la pregunta no se puede responder con esos datos, dilo.',
  );
  lines.push(
    'Si una visualización ayuda a la respuesta, incluye un chart spec opcional usando uno de tres tipos: sparkline (serie temporal), bars (categorías), funnel (etapas).',
  );
  lines.push('');
  lines.push(`Periodo: ${bundle.range.label}`);
  lines.push('');
  lines.push('Datos del periodo:');
  lines.push(`- Pipeline: ${bundle.pipeline.totalDeals} tratos · ${fmtMoney(bundle.pipeline.totalAmountCents)} · conv. ${bundle.pipeline.conversionPct}%`);
  lines.push(`- Tratos ganados: ${bundle.pipeline.wonInRange.count} (${fmtMoney(bundle.pipeline.wonInRange.amountCents)})`);
  lines.push(`- Facturas pagadas: ${bundle.revenue.invoicesPaid.count} (${fmtMoney(bundle.revenue.invoicesPaid.amountCents)})`);
  lines.push(`- Por cobrar: ${bundle.revenue.invoicesOutstanding.count} (${fmtMoney(bundle.revenue.invoicesOutstanding.amountCents)})`);
  lines.push(`- AR aging: actual $${bundle.revenue.ar.current.toFixed(0)} · 30d $${bundle.revenue.ar.thirty.toFixed(0)} · 60d $${bundle.revenue.ar.sixty.toFixed(0)} · 90d+ $${bundle.revenue.ar.ninety.toFixed(0)}`);
  lines.push(`- Contactos: ${bundle.customers.totalContacts} total · ${bundle.customers.newInRange} nuevos en periodo`);
  lines.push(`- Eventos calendario: ${bundle.calendar.eventsInRange} · ${bundle.calendar.hoursBooked}h reservadas · ${bundle.calendar.upcoming7d} próximos 7d`);
  lines.push(`- WhatsApp conectado: ${bundle.comms.whatsappConnected > 0 ? 'sí' : 'no'} · mensajes enviados: ${bundle.comms.messagesSentInRange}`);
  lines.push(`- Batería IA: ${bundle.battery.balance} cr · consumidos en periodo: ${bundle.battery.consumedInRange}`);
  lines.push('');
  lines.push('Tendencia 6 meses (ingresos por mes, oldest→newest):');
  for (const p of extra.revenueTrend.series) {
    lines.push(`  ${p.month}: ${fmtMoney(p.amountCents)} (${p.invoiceCount} fact)`);
  }
  lines.push(`MoM cambio: ${extra.revenueTrend.momChangePct}%`);
  lines.push('');
  lines.push('Proyección de cobro:');
  lines.push(`  vencido: $${extra.cashProjection.overdue.toFixed(0)} · 30d: $${extra.cashProjection.next30.toFixed(0)} · 60d: $${extra.cashProjection.next60.toFixed(0)} · 90d: $${extra.cashProjection.next90.toFixed(0)}`);
  lines.push('');
  lines.push(
    `Resultados de tratos en periodo: ganados ${extra.dealOutcomes.won} · perdidos ${extra.dealOutcomes.lost} · abiertos al cierre ${extra.dealOutcomes.openAtEnd} · trato promedio ${fmtMoney(extra.dealOutcomes.avgDealSizeCents)}`,
  );
  lines.push(
    `Ciclo de venta: ${extra.salesCycle.avgDaysQuoteToWon ?? 'sin datos'} días promedio · valor promedio $${extra.salesCycle.avgDealSize.toFixed(2)} (n=${extra.salesCycle.sample})`,
  );
  if (extra.productRanking.top.length > 0) {
    lines.push('');
    lines.push('Top productos por revenue:');
    for (const p of extra.productRanking.top.slice(0, 5)) {
      lines.push(`  - ${p.description}: ${fmtMoney(p.revenueCents)} (${p.timesQuoted}x cot, ${p.totalQuantity} u)`);
    }
  }
  lines.push('');
  lines.push(`Pregunta: ${question}`);
  lines.push('');
  lines.push('Responde EXACTAMENTE en este formato:');
  lines.push('```json');
  lines.push('{');
  lines.push('  "answer": "Tu respuesta en español, 1-3 párrafos.",');
  lines.push('  "chart": null');
  lines.push('}');
  lines.push('```');
  lines.push(
    'Si una gráfica ayuda, sustituye `null` por uno de:',
  );
  lines.push(
    '  {"type":"sparkline","title":"…","values":[n,n,…]} ' +
      '|| {"type":"bars","title":"…","items":[{"label":"…","value":n},…]} ' +
      '|| {"type":"funnel","title":"…","stages":[{"label":"…","count":n},…]}',
  );
  return lines.join('\n');
}

/**
 * Best-effort JSON extraction. The LLM might wrap the JSON in a
 * code fence, prepend a sentence, or omit the fence entirely; we
 * scan for the first balanced object and try to parse it.
 */
function extractJson(raw: string): { answer?: string; chart?: unknown } | null {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1]! : raw;
  try {
    return JSON.parse(candidate.trim());
  } catch {
    // Fall back to scanning for the first {...} block.
    const m = candidate.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

function offlineAnswer(
  question: string,
  bundle: ReportsBundle,
  extra: ExtraBundle,
): { answer: string; chart: ChartSpec | null } {
  // Cheap keyword routing — good enough so the page stays useful when
  // ai-runtime isn't reachable. Real answer requires the LLM.
  const q = question.toLowerCase();
  if (q.includes('ingres') || q.includes('mes') || q.includes('revenue')) {
    return {
      answer: `Tus ingresos pagados en los últimos 6 meses suman ${fmtMoney(extra.revenueTrend.series.reduce((s, p) => s + p.amountCents, 0))}. El último mes cerró en ${fmtMoney(extra.revenueTrend.series[extra.revenueTrend.series.length - 1]?.amountCents ?? 0)}, un cambio de ${extra.revenueTrend.momChangePct}% vs. el mes anterior.`,
      chart: {
        type: 'sparkline',
        title: 'Ingresos 6 meses',
        values: extra.revenueTrend.series.map((p) => p.amountCents),
        tone: extra.revenueTrend.momChangePct >= 0 ? 'moss' : 'danger',
      },
    };
  }
  if (q.includes('cobrar') || q.includes('caja') || q.includes('cash')) {
    return {
      answer: `Tienes ${bundle.revenue.invoicesOutstanding.count} facturas por cobrar (${fmtMoney(bundle.revenue.invoicesOutstanding.amountCents)}). De esas, $${extra.cashProjection.overdue.toFixed(0)} ya están vencidas y deberías priorizar.`,
      chart: {
        type: 'bars',
        title: 'Cobros proyectados',
        items: [
          { label: 'Vencido', value: extra.cashProjection.overdue },
          { label: '30d', value: extra.cashProjection.next30 },
          { label: '60d', value: extra.cashProjection.next60 },
          { label: '90d', value: extra.cashProjection.next90 },
        ],
        tone: 'moss',
      },
    };
  }
  return {
    answer: `Sin conexión a la IA en este momento. Datos rápidos del periodo "${bundle.range.label}": ${bundle.pipeline.wonInRange.count} tratos cerrados (${fmtMoney(bundle.pipeline.wonInRange.amountCents)}), ${bundle.revenue.invoicesPaid.count} facturas pagadas, ${bundle.customers.newInRange} contactos nuevos.`,
    chart: null,
  };
}

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

  const bundle = parsed.bundle as ReportsBundle;
  const extra = parsed.extra as ExtraBundle;
  const db = getDb();

  // Pre-flight credit debit. If the user has nothing left, bail
  // before we burn an LLM round trip.
  try {
    await db.billing.debit(auth.ctx.tenantId, ASK_COST, 'reports_ask', {
      question: parsed.question.slice(0, 80),
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'insufficient_credits') {
      const body: ApiEnvelope<null> = {
        success: false,
        data: null,
        error: 'insufficient_credits',
      };
      return NextResponse.json(body, { status: 402 });
    }
    throw err;
  }

  const secret = process.env.SERVICE_JWT_SECRET;
  const runtimeUrl = process.env.OS_RUNTIME_URL ?? 'http://localhost:5200';

  let answerText = '';
  let chart: ChartSpec | null = null;

  if (secret) {
    try {
      const token = await signServiceJwt(auth.ctx.tenantId, secret);
      const activeAgent = await db.agents.getActive(auth.ctx.tenantId);
      const message = buildPrompt(parsed.question, bundle, extra);
      const upstreamBody = activeAgent
        ? {
            message,
            agent: {
              slug: activeAgent.slug,
              name: activeAgent.name,
              systemPrompt: activeAgent.system_prompt,
              model: activeAgent.model,
              tools: activeAgent.tools,
            },
          }
        : { message };

      const upstream = await fetch(`${runtimeUrl}/chat`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(upstreamBody),
        cache: 'no-store',
      });

      if (upstream.ok) {
        const json = (await upstream.json()) as {
          success?: boolean;
          data?: { reply?: string };
        };
        const raw = json.data?.reply ?? '';
        const obj = extractJson(raw);
        if (obj && typeof obj.answer === 'string') {
          answerText = obj.answer;
          if (obj.chart) {
            const validated = chartSpecSchema.safeParse(obj.chart);
            if (validated.success) chart = validated.data;
          }
        } else if (raw) {
          // LLM didn't follow the JSON contract — use the raw text
          // rather than discard the whole answer.
          answerText = raw;
        }
      }
    } catch {
      /* fall through */
    }
  }

  if (!answerText) {
    const fallback = offlineAnswer(parsed.question, bundle, extra);
    answerText = fallback.answer;
    chart = fallback.chart;
  }

  const body: ApiEnvelope<{ answer: string; chart: ChartSpec | null; cost: number }> = {
    success: true,
    data: { answer: answerText, chart, cost: ASK_COST },
    error: null,
  };
  return NextResponse.json(body, { status: 200 });
}
