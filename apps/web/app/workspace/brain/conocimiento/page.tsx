import Link from 'next/link';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME, resolveSession } from '@/lib/auth/session';
import { DOCUMENT_KIND_LABELS, DOCUMENT_STATUS_LABELS } from '@kitz/db/document-kinds';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Conocimiento · KitZ' };

const STATUS_COLOR: Record<string, string> = {
  uploaded: 'var(--kitz-ink-3)',
  extracting: 'var(--kitz-accent-gold)',
  extracted: 'var(--kitz-moss)',
  failed: 'var(--kitz-danger)',
};

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('es', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Conocimiento — what KitZ knows about your business.
 *
 * Lists every uploaded document (the OCR/RAG corpus) with its kind,
 * status, size, and timestamp. Status colors map to the KitZ tokens
 * (moss=extracted, gold=extracting, danger=failed). Empty state
 * deeplinks to the upload UI under Canvas/Documentos.
 */
export default async function ConocimientoPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const db = getDb();
  const session = await resolveSession(db, token);
  const primary = session ? await db.findPrimaryTenant(session.user_id) : null;
  if (!session || !primary) return null;

  const docs = await db.documents.list(primary.tenant.id);

  const totalBytes = docs.reduce((s, d) => s + d.size_bytes, 0);
  const extracted = docs.filter((d) => d.status === 'extracted').length;

  return (
    <section
      style={{
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        height: '100%',
        overflow: 'auto',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Conocimiento</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#666' }}>
            {docs.length} documento{docs.length === 1 ? '' : 's'} · {extracted} extraído
            {extracted === 1 ? '' : 's'} · {fmtBytes(totalBytes)}
          </p>
        </div>
        <Link
          href="/workspace/canvas/documentos"
          style={{
            background: '#000',
            color: '#fff',
            border: '1px solid #000',
            padding: '0.4rem 0.8rem',
            fontSize: '0.75rem',
            textDecoration: 'none',
          }}
        >
          Subir documento
        </Link>
      </header>

      {docs.length === 0 ? (
        <div
          className="kz-panel"
          style={{
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--kitz-ink-2)',
            fontSize: '0.9rem',
          }}
        >
          <p style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: 'var(--kitz-ink)' }}>
            Aún no hay nada en la memoria de KitZ.
          </p>
          <p style={{ margin: '0 0 1rem', fontSize: '0.85rem' }}>
            Sube un PDF, una factura escaneada, o cualquier documento. KitZ extrae
            los datos clave y los usa cuando responde tus preguntas.
          </p>
          <Link
            href="/workspace/canvas/documentos"
            className="kz-button"
            style={{
              width: 'auto',
              padding: '0.5rem 1rem',
              fontSize: '0.75rem',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Subir el primero
          </Link>
        </div>
      ) : (
        <div
          className="kz-panel"
          style={{ padding: 0, overflow: 'hidden' }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.85rem',
            }}
          >
            <thead style={{ background: 'var(--kitz-sunk)' }}>
              <tr>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '0.6rem 0.85rem',
                    borderBottom: '1px solid var(--kitz-line-strong)',
                    fontSize: '0.65rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--kitz-ink-3)',
                    fontWeight: 600,
                  }}
                >
                  Archivo
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '0.6rem 0.85rem',
                    borderBottom: '1px solid var(--kitz-line-strong)',
                    fontSize: '0.65rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--kitz-ink-3)',
                    fontWeight: 600,
                  }}
                >
                  Tipo
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '0.6rem 0.85rem',
                    borderBottom: '1px solid var(--kitz-line-strong)',
                    fontSize: '0.65rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--kitz-ink-3)',
                    fontWeight: 600,
                  }}
                >
                  Estado
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: '0.6rem 0.85rem',
                    borderBottom: '1px solid var(--kitz-line-strong)',
                    fontSize: '0.65rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--kitz-ink-3)',
                    fontWeight: 600,
                  }}
                >
                  Tamaño
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '0.6rem 0.85rem',
                    borderBottom: '1px solid var(--kitz-line-strong)',
                    fontSize: '0.65rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--kitz-ink-3)',
                    fontWeight: 600,
                  }}
                >
                  Subido
                </th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--kitz-line)' }}>
                  <td
                    style={{
                      padding: '0.55rem 0.85rem',
                      maxWidth: '20rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {d.filename}
                  </td>
                  <td style={{ padding: '0.55rem 0.85rem', color: 'var(--kitz-ink-2)' }}>
                    {DOCUMENT_KIND_LABELS[d.kind]}
                  </td>
                  <td
                    style={{
                      padding: '0.55rem 0.85rem',
                      color: STATUS_COLOR[d.status] ?? 'var(--kitz-ink)',
                      fontWeight: 600,
                    }}
                  >
                    {DOCUMENT_STATUS_LABELS[d.status]}
                  </td>
                  <td
                    style={{
                      padding: '0.55rem 0.85rem',
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                      color: 'var(--kitz-ink-2)',
                    }}
                  >
                    {fmtBytes(d.size_bytes)}
                  </td>
                  <td
                    style={{
                      padding: '0.55rem 0.85rem',
                      color: 'var(--kitz-ink-3)',
                      fontSize: '0.75rem',
                    }}
                  >
                    {fmtDate(d.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
