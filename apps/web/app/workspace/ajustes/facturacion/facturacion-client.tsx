'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BatteryLedgerEntry, BatteryState, BillingSubscription } from '@kitz/db';
import {
  BILLING_PLAN_SPECS,
  BILLING_TOPUP_PACKS,
  type BillingPlan,
  type PlanSpec,
  type TopupPack,
} from '@kitz/db/billing-plans';

type Snapshot = {
  subscription: BillingSubscription;
  battery: BatteryState;
  ledger: BatteryLedgerEntry[];
};

type SnapshotResponse = { success: boolean; data: Snapshot | null; error: string | null };
type CheckoutResponse = {
  success: boolean;
  data: { url: string; sessionId: string } | null;
  error: string | null;
};
type ConfirmResponse = {
  success: boolean;
  data: { applied: boolean; subscription: BillingSubscription; battery: BatteryState } | null;
  error: string | null;
};

function priceLabel(cents: number): string {
  return cents === 0
    ? 'Gratis'
    : `$${(cents / 100).toFixed(2)} USD${cents > 0 ? '/mes' : ''}`;
}

function topupLabel(cents: number): string {
  return `$${(cents / 100).toFixed(2)} USD`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function FacturacionClient() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/billing', { cache: 'no-store' });
      const j: SnapshotResponse = await r.json();
      if (j.data) setSnapshot(j.data);
      else setError(j.error ?? 'load_failed');
    } catch {
      setError('network');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Pick up `?session_id=` from a stub-checkout return.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get('session_id');
    if (!sessionId) return;
    void (async () => {
      try {
        const r = await fetch('/api/billing/confirm', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        const j: ConfirmResponse = await r.json();
        if (j.success && j.data) {
          setNotice(j.data.applied ? 'Compra aplicada' : 'Ya estaba aplicada');
          await load();
        } else {
          setError(j.error ?? 'confirm_failed');
        }
      } catch {
        setError('network');
      } finally {
        url.searchParams.delete('session_id');
        url.searchParams.delete('success');
        window.history.replaceState({}, '', url.toString());
      }
    })();
  }, [load]);

  const startCheckout = async (
    payload: { type: 'plan'; plan: BillingPlan } | { type: 'topup'; packId: string },
    busyKey: string,
  ) => {
    setBusy(busyKey);
    setError(null);
    setNotice(null);
    try {
      const r = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j: CheckoutResponse = await r.json();
      if (j.data?.url) {
        window.location.href = j.data.url;
      } else {
        setError(j.error ?? 'checkout_failed');
      }
    } catch {
      setError('network');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section
      style={{
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        height: '100%',
        overflow: 'auto',
      }}
    >
      <header>
        <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Facturación</h1>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#666' }}>
          Plan, batería de créditos y movimientos.
        </p>
      </header>

      {notice && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            border: '1px solid #1a4',
            background: '#f4fff7',
            fontSize: '0.75rem',
          }}
        >
          {notice}
        </div>
      )}
      {error && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            border: '1px solid #a00',
            background: '#fff4f4',
            fontSize: '0.75rem',
            color: '#a00',
          }}
        >
          Error: {error}
        </div>
      )}

      {loading || !snapshot ? (
        <div style={{ fontSize: '0.8rem', color: '#666' }}>Cargando…</div>
      ) : (
        <>
          <BatteryPanel battery={snapshot.battery} subscription={snapshot.subscription} />

          <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>Planes</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {(Object.values(BILLING_PLAN_SPECS) as PlanSpec[]).map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  current={snapshot.subscription.plan}
                  busy={busy === `plan_${plan.id}`}
                  onSelect={() => startCheckout({ type: 'plan', plan: plan.id }, `plan_${plan.id}`)}
                />
              ))}
            </div>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>
              Recargar batería
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {BILLING_TOPUP_PACKS.map((pack) => (
                <TopupCard
                  key={pack.id}
                  pack={pack}
                  busy={busy === `topup_${pack.id}`}
                  onSelect={() =>
                    startCheckout({ type: 'topup', packId: pack.id }, `topup_${pack.id}`)
                  }
                />
              ))}
            </div>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>Movimientos</h2>
            <LedgerTable ledger={snapshot.ledger} />
          </section>
        </>
      )}
    </section>
  );
}

function BatteryPanel({
  battery,
  subscription,
}: {
  battery: BatteryState;
  subscription: BillingSubscription;
}) {
  const lifetime = Math.max(battery.lifetime_topup, 1);
  const pct = Math.min(100, Math.round((battery.balance / lifetime) * 100));
  return (
    <section
      style={{
        border: '1px solid #000',
        padding: '1rem',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: '0.7rem', color: '#666' }}>Plan actual</div>
          <div style={{ fontWeight: 600 }}>
            {BILLING_PLAN_SPECS[subscription.plan].name}{' '}
            {subscription.status !== 'active' && (
              <span style={{ color: '#a60', fontSize: '0.75rem' }}>· {subscription.status}</span>
            )}
          </div>
          {subscription.current_period_end && (
            <div style={{ fontSize: '0.7rem', color: '#666' }}>
              Renueva: {formatDate(subscription.current_period_end)}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.7rem', color: '#666' }}>Batería</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {battery.balance.toLocaleString('es')}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#666' }}>
            de {battery.lifetime_topup.toLocaleString('es')} cr ·{' '}
            {battery.lifetime_debit.toLocaleString('es')} usados
          </div>
        </div>
      </div>
      <div
        style={{
          height: '0.5rem',
          background: '#eee',
          border: '1px solid #000',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: pct > 25 ? '#000' : '#a60',
            transition: 'width 240ms ease',
          }}
        />
      </div>
    </section>
  );
}

function PlanCard({
  plan,
  current,
  busy,
  onSelect,
}: {
  plan: PlanSpec;
  current: BillingPlan;
  busy: boolean;
  onSelect: () => void;
}) {
  const isCurrent = plan.id === current;
  return (
    <article
      style={{
        border: isCurrent ? '2px solid #000' : '1px solid #000',
        padding: '0.85rem',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <header>
        <div style={{ fontWeight: 600 }}>{plan.name}</div>
        <div style={{ fontSize: '0.75rem', color: '#666' }}>{priceLabel(plan.priceCents)}</div>
      </header>
      <div style={{ fontSize: '0.7rem', color: '#666' }}>
        {plan.monthlyCredits.toLocaleString('es')} cr/mes · {plan.seats} asiento
        {plan.seats > 1 ? 's' : ''}
      </div>
      <ul
        style={{
          margin: 0,
          paddingLeft: '1rem',
          fontSize: '0.7rem',
          color: '#444',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.15rem',
        }}
      >
        {plan.features.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <button
        type="button"
        disabled={busy || isCurrent}
        onClick={onSelect}
        style={{
          marginTop: 'auto',
          background: isCurrent ? '#fff' : '#000',
          color: isCurrent ? '#666' : '#fff',
          border: '1px solid #000',
          padding: '0.4rem 0.75rem',
          fontSize: '0.75rem',
          cursor: isCurrent || busy ? 'default' : 'pointer',
        }}
      >
        {isCurrent ? 'Plan actual' : busy ? 'Redirigiendo…' : 'Cambiar a este plan'}
      </button>
    </article>
  );
}

function TopupCard({
  pack,
  busy,
  onSelect,
}: {
  pack: TopupPack;
  busy: boolean;
  onSelect: () => void;
}) {
  return (
    <article
      style={{
        border: '1px solid #000',
        padding: '0.85rem',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
      }}
    >
      <div style={{ fontWeight: 600 }}>{pack.name}</div>
      <div style={{ fontSize: '0.75rem', color: '#666' }}>{topupLabel(pack.priceCents)}</div>
      <button
        type="button"
        disabled={busy}
        onClick={onSelect}
        style={{
          marginTop: 'auto',
          background: '#000',
          color: '#fff',
          border: '1px solid #000',
          padding: '0.4rem 0.75rem',
          fontSize: '0.75rem',
          cursor: busy ? 'wait' : 'pointer',
        }}
      >
        {busy ? 'Redirigiendo…' : 'Comprar'}
      </button>
    </article>
  );
}

function LedgerTable({ ledger }: { ledger: BatteryLedgerEntry[] }) {
  if (ledger.length === 0) {
    return (
      <div
        style={{
          padding: '1.5rem',
          border: '1px dashed #999',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: '#666',
        }}
      >
        Sin movimientos.
      </div>
    );
  }
  return (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.75rem',
        border: '1px solid #000',
      }}
    >
      <thead style={{ background: '#f4f4f4' }}>
        <tr>
          <th style={{ textAlign: 'left', padding: '0.4rem', borderBottom: '1px solid #000' }}>
            Fecha
          </th>
          <th style={{ textAlign: 'left', padding: '0.4rem', borderBottom: '1px solid #000' }}>
            Razón
          </th>
          <th style={{ textAlign: 'right', padding: '0.4rem', borderBottom: '1px solid #000' }}>
            Δ créditos
          </th>
        </tr>
      </thead>
      <tbody>
        {ledger.map((e) => (
          <tr key={e.id} style={{ borderBottom: '1px solid #ddd' }}>
            <td style={{ padding: '0.4rem', color: '#666' }}>{formatDate(e.created_at)}</td>
            <td style={{ padding: '0.4rem' }}>{e.reason}</td>
            <td
              style={{
                padding: '0.4rem',
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
                color: e.delta > 0 ? '#063' : '#a00',
                fontWeight: 600,
              }}
            >
              {e.delta > 0 ? '+' : ''}
              {e.delta.toLocaleString('es')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
