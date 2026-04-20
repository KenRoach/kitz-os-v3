import { NextResponse } from 'next/server';
import { z } from 'zod';
import { signServiceJwt } from '@kitz/config/jwt';
import type { ApiEnvelope } from '@kitz/types';
import { getDb } from '@/lib/db';
import { requireTenant } from '@/lib/auth/require-tenant';
import type { ReportsBundle } from '@/lib/reports/aggregations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  bundle: z.unknown(),
});

const INSIGHT_COST = 2;

function fmtMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString('es')}`;
}

/**
 * Translate the report bundle into a tight Spanish prompt. The active
 * agent does the actual writing; this just gives it the data + tone.
 */
function buildPrompt(b: ReportsBundle): string {
  const lines: string[] = [];
  lines.push(`Eres KitZ, asistente de un dueño de negocio en Latinoamérica.`);
  lines.push(`Genera un resumen ejecutivo en español de máximo 4 frases.`);
  lines.push(`Tono: directo, accionable, sin jerga corporativa. Sin saludos.`);
  lines.push('');
  lines.push(`Datos del periodo "${b.range.label}":`);
  lines.push(`- Pipeline total: ${b.pipeline.totalDeals} tratos · ${fmtMoney(b.pipeline.totalAmountCents)}`);
  lines.push(`- Tratos ganados en periodo: ${b.pipeline.wonInRange.count} (${fmtMoney(b.pipeline.wonInRange.amountCents)}) · conversión ${b.pipeline.conversionPct}%`);
  lines.push(`- Facturas pagadas: ${b.revenue.invoicesPaid.count} (${fmtMoney(b.revenue.invoicesPaid.amountCents)})`);
  lines.push(`- Por cobrar: ${b.revenue.invoicesOutstanding.count} (${fmtMoney(b.revenue.invoicesOutstanding.amountCents)})`);
  lines.push(`- AR vencido +90d: $${b.revenue.ar.ninety.toFixed(2)}`);
  lines.push(`- Contactos nuevos: ${b.customers.newInRange} (total ${b.customers.totalContacts})`);
  lines.push(`- Eventos en calendario: ${b.calendar.eventsInRange} · ${b.calendar.hoursBooked}h reservadas`);
  lines.push(`- Mensajes enviados (chat KitZ): ${b.comms.messagesSentInRange}`);
  lines.push(`- WhatsApp conectado: ${b.comms.whatsappConnected > 0 ? 'sí' : 'no'}`);
  lines.push(`- Batería IA: ${b.battery.balance} cr · consumidos en periodo ${b.battery.consumedInRange}`);
  lines.push('');
  lines.push(`Indica 1) la métrica más importante 2) qué necesita atención 3) próximo paso recomendado.`);
  return lines.join('\n');
}

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

  const bundle = parsed.bundle as ReportsBundle;
  const db = getDb();

  // Pre-flight credit debit (same pattern as /api/chat).
  try {
    await db.billing.debit(auth.ctx.tenantId, INSIGHT_COST, 'reports_insight', {
      range: bundle.range?.label ?? 'unknown',
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
  if (!secret) {
    const body: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: 'service_jwt_secret_not_configured',
    };
    return NextResponse.json(body, { status: 500 });
  }

  const message = buildPrompt(bundle);
  let text = '';

  try {
    const token = await signServiceJwt(auth.ctx.tenantId, secret);
    const activeAgent = await db.agents.getActive(auth.ctx.tenantId);
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
      text = json.data?.reply ?? '';
    }
  } catch {
    /* fall through to offline summary */
  }

  // ai-runtime is optional in dev. Provide a deterministic fallback so the
  // page stays functional and the credit debit is honoured.
  if (!text) {
    text = buildOfflineSummary(bundle);
  }

  const body: ApiEnvelope<{ text: string; cost: number }> = {
    success: true,
    data: { text, cost: INSIGHT_COST },
    error: null,
  };
  return NextResponse.json(body, { status: 200 });
}

function buildOfflineSummary(b: ReportsBundle): string {
  const wonAmount = fmtMoney(b.pipeline.wonInRange.amountCents);
  const outstanding = fmtMoney(b.revenue.invoicesOutstanding.amountCents);
  const overdue = b.revenue.ar.ninety > 0 ? `$${b.revenue.ar.ninety.toFixed(2)} +90d vencido` : null;

  const headline =
    b.pipeline.wonInRange.count > 0
      ? `Cerraste ${b.pipeline.wonInRange.count} tratos por ${wonAmount} en ${b.range.label.toLowerCase()}.`
      : `Sin tratos cerrados en ${b.range.label.toLowerCase()}.`;

  const attention =
    overdue
      ? `Atención: tienes ${overdue} en cobranza.`
      : b.revenue.invoicesOutstanding.count > 0
        ? `${b.revenue.invoicesOutstanding.count} facturas por cobrar (${outstanding}).`
        : `Sin cobranza pendiente.`;

  const next =
    b.customers.newInRange === 0
      ? `Próximo paso: agrega contactos nuevos al pipeline.`
      : b.calendar.upcoming7d === 0
        ? `Próximo paso: agenda seguimientos esta semana.`
        : `Próximo paso: convierte los ${b.calendar.upcoming7d} eventos próximos en cierres.`;

  return [headline, attention, next].join(' ');
}
