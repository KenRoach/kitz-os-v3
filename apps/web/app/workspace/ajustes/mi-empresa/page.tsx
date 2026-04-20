import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME, resolveSession } from '@/lib/auth/session';
import { brandStore } from '@/lib/brand/store';
import { BrandForm } from './brand-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mi empresa · KitZ' };

/**
 * "Mi empresa" — the brand identity layer that personalizes every
 * quote and invoice the user exports as PDF. Logo, datos fiscales,
 * colores, notas al pie, y los defaults de moneda + impuesto.
 *
 * The actual form is a client component so the logo picker can
 * turn a File into a data URL in-browser without a separate
 * upload API (that arrives with Supabase Storage later). This
 * page just server-reads the current settings and hands them off
 * as initialValues.
 */
export default async function MiEmpresaPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const db = getDb();
  const session = await resolveSession(db, token);
  const primary = session ? await db.findPrimaryTenant(session.user_id) : null;
  if (!session || !primary) return null;

  const settings = brandStore.get(primary.tenant.id, primary.tenant.name);

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
      <header>
        <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Mi empresa</h1>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#666' }}>
          Logo, colores, datos fiscales y notas que aparecen en cada cotización y factura en PDF.
        </p>
      </header>

      <BrandForm initial={settings} />
    </section>
  );
}
