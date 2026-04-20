import Link from 'next/link';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { SESSION_COOKIE_NAME, resolveSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tareas · KitZ' };

type Task = {
  id: string;
  title: string;
  detail?: string;
  href: string;
  priority: 'high' | 'medium' | 'low';
  source: 'invoice' | 'deal' | 'setup' | 'whatsapp';
};

const FREE_GRANT = 100;

const PRIORITY_COLOR: Record<Task['priority'], string> = {
  high: 'var(--kitz-danger)',
  medium: 'var(--kitz-accent-gold)',
  low: 'var(--kitz-ink-3)',
};

const SOURCE_LABEL: Record<Task['source'], string> = {
  invoice: 'Factura',
  deal: 'Trato',
  setup: 'Setup',
  whatsapp: 'WhatsApp',
};

/**
 * Tareas — derived to-do list from real tenant signals.
 *
 * Aggregates "things that need attention" across the data model:
 *   - Invoices past due_at and not paid       → high priority
 *   - Invoices in 'sent' status                → medium (chase)
 *   - Deals stuck in propuesta/negociacion     → medium (advance)
 *   - Setup milestones not yet done            → low (configure)
 *   - WhatsApp not connected                   → medium (connect)
 *
 * No new "tasks" table — pure aggregation. When KitZ ships a real
 * tasks store later, this page swaps to read from it.
 */
export default async function TareasPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const db = getDb();
  const session = await resolveSession(db, token);
  const primary = session ? await db.findPrimaryTenant(session.user_id) : null;
  if (!session || !primary) return null;

  const [invoicesAll, deals, contactsCount, activeAgent, whatsappConnected, invoiceCount, battery] =
    await Promise.all([
      db.invoices.list(primary.tenant.id),
      db.deals.list(primary.tenant.id),
      db.contacts.count(primary.tenant.id),
      db.agents.getActive(primary.tenant.id),
      db.whatsapp.countConnected(primary.tenant.id),
      db.invoices.count(primary.tenant.id),
      db.billing.getBattery(primary.tenant.id),
    ]);

  const now = new Date().toISOString();
  const tasks: Task[] = [];

  // Overdue invoices → high
  for (const inv of invoicesAll) {
    if (inv.kind !== 'invoice') continue;
    if (inv.status === 'paid' || inv.status === 'cancelled' || inv.status === 'expired') continue;
    if (inv.due_at && inv.due_at < now) {
      tasks.push({
        id: `inv-${inv.id}`,
        title: `Cobrar factura vencida ${inv.number}`,
        detail: `${inv.customer_name} · ${inv.currency} ${inv.total.toFixed(2)}`,
        href: '/workspace/cotizaciones',
        priority: 'high',
        source: 'invoice',
      });
    } else if (inv.status === 'sent') {
      tasks.push({
        id: `inv-${inv.id}`,
        title: `Seguimiento ${inv.number}`,
        detail: `Enviada a ${inv.customer_name}, sin respuesta`,
        href: '/workspace/cotizaciones',
        priority: 'medium',
        source: 'invoice',
      });
    }
  }

  // Stale deals → medium
  for (const d of deals) {
    if (d.stage === 'propuesta' || d.stage === 'negociacion') {
      tasks.push({
        id: `deal-${d.id}`,
        title: `Avanzar trato: ${d.title}`,
        detail: `Stage: ${d.stage} · $${d.amount.toFixed(2)}`,
        href: '/workspace/ventas',
        priority: 'medium',
        source: 'deal',
      });
    }
  }

  // Setup milestones → low / medium
  if (whatsappConnected === 0) {
    tasks.push({
      id: 'setup-whatsapp',
      title: 'Conectar WhatsApp',
      detail: 'Esencial para recibir mensajes de clientes',
      href: '/workspace/conversaciones',
      priority: 'medium',
      source: 'whatsapp',
    });
  }
  if (contactsCount === 0) {
    tasks.push({
      id: 'setup-contact',
      title: 'Agregar tu primer contacto',
      href: '/workspace/contactos',
      priority: 'low',
      source: 'setup',
    });
  }
  if (!activeAgent) {
    tasks.push({
      id: 'setup-agent',
      title: 'Activar tu primer agente',
      href: '/workspace/brain/agentes',
      priority: 'low',
      source: 'setup',
    });
  }
  if (invoiceCount === 0) {
    tasks.push({
      id: 'setup-quote',
      title: 'Crear tu primera cotización',
      href: '/workspace/cotizaciones',
      priority: 'low',
      source: 'setup',
    });
  }
  if (battery.lifetime_topup <= FREE_GRANT) {
    tasks.push({
      id: 'setup-topup',
      title: 'Recargar batería de IA',
      detail: `${battery.balance} cr restantes`,
      href: '/workspace/ajustes/facturacion',
      priority: 'low',
      source: 'setup',
    });
  }

  // Sort: high → medium → low
  const order: Record<Task['priority'], number> = { high: 0, medium: 1, low: 2 };
  tasks.sort((a, b) => order[a.priority] - order[b.priority]);

  const counts = {
    high: tasks.filter((t) => t.priority === 'high').length,
    medium: tasks.filter((t) => t.priority === 'medium').length,
    low: tasks.filter((t) => t.priority === 'low').length,
  };

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
        <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Tareas</h1>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#666' }}>
          {tasks.length === 0
            ? 'Nada pendiente. Buen trabajo.'
            : `${tasks.length} pendiente${tasks.length === 1 ? '' : 's'} · ${counts.high} urgente${counts.high === 1 ? '' : 's'} · ${counts.medium} medio${counts.medium === 1 ? '' : 's'} · ${counts.low} baja${counts.low === 1 ? '' : 's'}`}
        </p>
      </header>

      {tasks.length === 0 ? (
        <div
          className="kz-panel"
          style={{
            padding: '2.5rem',
            textAlign: 'center',
            color: 'var(--kitz-moss)',
          }}
        >
          <p style={{ margin: 0, fontSize: '1.1rem' }}>✓ Día limpio</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--kitz-ink-2)' }}>
            Sin facturas vencidas, sin tratos estancados, todo configurado.
          </p>
        </div>
      ) : (
        <ol
          className="kz-panel"
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}
        >
          {tasks.map((t, i) => (
            <li key={t.id}>
              <Link
                href={t.href}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '0.5rem 1fr auto',
                  alignItems: 'baseline',
                  gap: '0.85rem',
                  padding: '0.75rem 0.85rem',
                  borderBottom:
                    i < tasks.length - 1 ? '1px solid var(--kitz-line)' : 'none',
                  textDecoration: 'none',
                  color: 'var(--kitz-ink)',
                }}
              >
                <span
                  aria-hidden
                  title={t.priority}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: PRIORITY_COLOR[t.priority],
                    alignSelf: 'center',
                  }}
                />
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{t.title}</span>
                  {t.detail && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--kitz-ink-3)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t.detail}
                    </span>
                  )}
                </span>
                <span
                  style={{
                    fontSize: '0.6rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--kitz-ink-3)',
                    fontFamily: 'var(--kitz-font-mono)',
                    fontWeight: 600,
                  }}
                >
                  {SOURCE_LABEL[t.source]}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
