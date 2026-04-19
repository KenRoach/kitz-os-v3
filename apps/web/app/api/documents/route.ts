import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiEnvelope } from '@kitz/types';
import type { DocumentRecord, DocumentKind, DocumentStatus } from '@kitz/db';
import { DOCUMENT_KINDS, DOCUMENT_STATUSES } from '@kitz/db/document-kinds';
import { getDb } from '@/lib/db';
import { requireTenant } from '@/lib/auth/require-tenant';
import { getOcrProvider } from '@/lib/ocr/provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  kind: z.enum(DOCUMENT_KINDS),
  filename: z.string().trim().min(1).max(240),
  mimeType: z.string().trim().min(1).max(100),
  sizeBytes: z.number().int().positive().max(25 * 1024 * 1024),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export async function GET(request: Request): Promise<Response> {
  const auth = await requireTenant();
  if (!auth.ok) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: auth.error };
    return NextResponse.json(body, { status: auth.status });
  }
  const url = new URL(request.url);
  const opts: { kind?: DocumentKind; status?: DocumentStatus } = {};
  const kind = url.searchParams.get('kind');
  const status = url.searchParams.get('status');
  if (kind && (DOCUMENT_KINDS as readonly string[]).includes(kind)) {
    opts.kind = kind as DocumentKind;
  }
  if (status && (DOCUMENT_STATUSES as readonly string[]).includes(status)) {
    opts.status = status as DocumentStatus;
  }
  const db = getDb();
  const items = await db.documents.list(auth.ctx.tenantId, opts);
  const body: ApiEnvelope<{ items: DocumentRecord[] }> = {
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
  if (auth.ctx.role === 'viewer') {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'forbidden' };
    return NextResponse.json(body, { status: 403 });
  }

  let parsed: z.infer<typeof createSchema>;
  try {
    parsed = createSchema.parse(await request.json());
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: 'invalid_body' };
    return NextResponse.json(body, { status: 400 });
  }

  const db = getDb();
  const provider = getOcrProvider();

  // Synthesise a storage key. Real impl uses Supabase Storage signed
  // upload + returns the bucket path.
  const storageKey = `tenants/${auth.ctx.tenantId}/${Date.now()}-${parsed.filename}`;

  try {
    const created = await db.documents.create(auth.ctx.tenantId, {
      kind: parsed.kind,
      filename: parsed.filename,
      mimeType: parsed.mimeType,
      sizeBytes: parsed.sizeBytes,
      storageKey,
      uploadedBy: auth.ctx.userId,
      notes: parsed.notes ?? null,
    });

    // Run extract synchronously in the stub. Real impl enqueues a job
    // and the UI polls the document until status leaves 'extracting'.
    await db.documents.update(auth.ctx.tenantId, created.id, { status: 'extracting' });
    const result = await provider.extract({
      kind: created.kind,
      filename: created.filename,
      mimeType: created.mime_type,
      sizeBytes: created.size_bytes,
    });
    const finalDoc = result.ok
      ? await db.documents.update(auth.ctx.tenantId, created.id, {
          status: 'extracted',
          extractedData: result.data,
          extractError: null,
        })
      : await db.documents.update(auth.ctx.tenantId, created.id, {
          status: 'failed',
          extractError: result.error,
        });

    await db.recordActivity({
      tenantId: auth.ctx.tenantId,
      actor: auth.ctx.userId,
      action: result.ok ? 'extracted_document' : 'failed_document_extract',
      entity: created.filename,
    });

    const body: ApiEnvelope<DocumentRecord> = {
      success: true,
      data: finalDoc ?? created,
      error: null,
    };
    return NextResponse.json(body, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'create_failed';
    const known = [
      'invalid_filename',
      'invalid_mime',
      'invalid_size',
      'invalid_storage_key',
      'invalid_uploader',
      'invalid_notes',
    ];
    const reason = known.includes(message) ? message : 'create_failed';
    const body: ApiEnvelope<null> = { success: false, data: null, error: reason };
    return NextResponse.json(body, { status: 400 });
  }
}
