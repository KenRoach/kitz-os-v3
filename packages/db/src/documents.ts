import { randomUUID } from 'node:crypto';
import {
  DOCUMENT_KINDS,
  DOCUMENT_STATUSES,
  type DocumentKind,
  type DocumentStatus,
} from './document-kinds';

export { DOCUMENT_KINDS, DOCUMENT_STATUSES };
export type { DocumentKind, DocumentStatus };

export type DocumentRecord = {
  id: string;
  tenant_id: string;
  kind: DocumentKind;
  status: DocumentStatus;
  /** Original filename as uploaded by the user. */
  filename: string;
  mime_type: string;
  /** File size in bytes. Capped at the API layer. */
  size_bytes: number;
  /** Storage key in the bucket; for the in-memory stub this is a synthetic id. */
  storage_key: string;
  /** Free-form notes from the uploader. */
  notes: string | null;
  /** Structured fields produced by the OCR pipeline. */
  extracted_data: Record<string, unknown> | null;
  /** Provider-side error if status === 'failed'. */
  extract_error: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
};

export type DocumentInput = {
  kind: DocumentKind;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  uploadedBy: string;
  notes?: string | null;
};

export type DocumentPatch = Partial<{
  kind: DocumentKind;
  status: DocumentStatus;
  notes: string | null;
  extractedData: Record<string, unknown> | null;
  extractError: string | null;
}>;

export type DocumentsStore = {
  list(
    tenantId: string,
    opts?: { kind?: DocumentKind; status?: DocumentStatus },
  ): Promise<DocumentRecord[]>;
  get(tenantId: string, id: string): Promise<DocumentRecord | null>;
  create(tenantId: string, input: DocumentInput): Promise<DocumentRecord>;
  update(tenantId: string, id: string, patch: DocumentPatch): Promise<DocumentRecord | null>;
  remove(tenantId: string, id: string): Promise<boolean>;
  count(tenantId: string): Promise<number>;
};

const MAX_FILENAME = 240;
const MAX_NOTES = 1000;
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

function nowIso(): string {
  return new Date().toISOString();
}

function validateInput(input: DocumentInput): void {
  if (typeof input.filename !== 'string' || input.filename.trim().length === 0) {
    throw new Error('invalid_filename');
  }
  if (input.filename.length > MAX_FILENAME) throw new Error('invalid_filename');
  if (typeof input.mimeType !== 'string' || input.mimeType.trim().length === 0) {
    throw new Error('invalid_mime');
  }
  if (
    typeof input.sizeBytes !== 'number' ||
    !Number.isFinite(input.sizeBytes) ||
    input.sizeBytes <= 0 ||
    input.sizeBytes > MAX_BYTES
  ) {
    throw new Error('invalid_size');
  }
  if (typeof input.storageKey !== 'string' || input.storageKey.trim().length === 0) {
    throw new Error('invalid_storage_key');
  }
  if (typeof input.uploadedBy !== 'string' || input.uploadedBy.trim().length === 0) {
    throw new Error('invalid_uploader');
  }
  if (input.notes != null && input.notes.length > MAX_NOTES) {
    throw new Error('invalid_notes');
  }
}

export function createMemoryDocumentsStore(): DocumentsStore {
  const byTenant = new Map<string, Map<string, DocumentRecord>>();

  function bucket(tenantId: string): Map<string, DocumentRecord> {
    let b = byTenant.get(tenantId);
    if (!b) {
      b = new Map();
      byTenant.set(tenantId, b);
    }
    return b;
  }

  return {
    async list(tenantId, opts) {
      const all = Array.from(bucket(tenantId).values()).sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      );
      let out = all;
      if (opts?.kind) out = out.filter((d) => d.kind === opts.kind);
      if (opts?.status) out = out.filter((d) => d.status === opts.status);
      return out;
    },

    async get(tenantId, id) {
      return bucket(tenantId).get(id) ?? null;
    },

    async create(tenantId, input) {
      validateInput(input);
      const doc: DocumentRecord = {
        id: randomUUID(),
        tenant_id: tenantId,
        kind: input.kind,
        status: 'uploaded',
        filename: input.filename.trim(),
        mime_type: input.mimeType.trim(),
        size_bytes: Math.floor(input.sizeBytes),
        storage_key: input.storageKey.trim(),
        notes: input.notes?.trim() || null,
        extracted_data: null,
        extract_error: null,
        uploaded_by: input.uploadedBy,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      bucket(tenantId).set(doc.id, doc);
      return doc;
    },

    async update(tenantId, id, patch) {
      const existing = bucket(tenantId).get(id);
      if (!existing) return null;
      if (patch.notes != null && patch.notes.length > MAX_NOTES) {
        throw new Error('invalid_notes');
      }
      const updated: DocumentRecord = {
        ...existing,
        ...(patch.kind !== undefined ? { kind: patch.kind } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes?.trim() || null } : {}),
        ...(patch.extractedData !== undefined ? { extracted_data: patch.extractedData } : {}),
        ...(patch.extractError !== undefined ? { extract_error: patch.extractError } : {}),
        updated_at: nowIso(),
      };
      bucket(tenantId).set(id, updated);
      return updated;
    },

    async remove(tenantId, id) {
      return bucket(tenantId).delete(id);
    },

    async count(tenantId) {
      return bucket(tenantId).size;
    },
  };
}
