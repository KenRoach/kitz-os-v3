import { NextResponse } from 'next/server';
import type { ApiEnvelope } from '@kitz/types';
import { getDb } from '@/lib/db';
import { requireTenant } from '@/lib/auth/require-tenant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type SearchHit = {
  id: string;
  type: 'contact' | 'deal';
  title: string;
  subtitle: string | null;
  href: string;
};

export async function GET(request: Request): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  if (q.length < 2) {
    const body: ApiEnvelope<{ results: SearchHit[] }> = {
      success: true,
      data: { results: [] },
      error: null,
    };
    return NextResponse.json(body, { status: 200 });
  }

  const db = getDb();
  const [contactPage, deals] = await Promise.all([
    db.contacts.list(auth.ctx.tenantId, { query: q, limit: 10 }),
    db.deals.list(auth.ctx.tenantId),
  ]);

  const ql = q.toLowerCase();
  const dealHits = deals
    .filter((d) => d.title.toLowerCase().includes(ql) || d.notes?.toLowerCase().includes(ql))
    .slice(0, 10);

  const results: SearchHit[] = [
    ...contactPage.items.map<SearchHit>((c) => ({
      id: c.id,
      type: 'contact',
      title: c.name,
      subtitle: c.company ?? c.email ?? c.phone ?? null,
      href: `/workspace/contactos?id=${c.id}`,
    })),
    ...dealHits.map<SearchHit>((d) => ({
      id: d.id,
      type: 'deal',
      title: d.title,
      subtitle: `${d.stage} · ${d.currency} ${Math.round(d.amount).toLocaleString()}`,
      href: `/workspace/ventas`,
    })),
  ];

  const body: ApiEnvelope<{ results: SearchHit[] }> = {
    success: true,
    data: { results },
    error: null,
    meta: { total: results.length },
  };
  return NextResponse.json(body, { status: 200 });
}
