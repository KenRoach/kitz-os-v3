'use client';

/**
 * AutoPrint — same pattern as /print/cotizaciones/[id]/auto-print.
 * Waits for fonts to settle, fires window.print(), closes the tab on
 * afterprint. Manual fallback button for browsers (Safari) that
 * suppress auto-print without a user gesture.
 *
 * Kept as a sibling instead of a shared component because each
 * print route may want subtle behavior differences down the line
 * (page-break logic, custom print CSS injection, etc).
 */

import { useEffect, useState } from 'react';

export function AutoPrint(): React.ReactElement | null {
  const [manualNeeded, setManualNeeded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function go() {
      try {
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }
        if (cancelled) return;
        window.print();
      } catch {
        setManualNeeded(true);
      }
    }
    const onAfter = () => window.close();
    window.addEventListener('afterprint', onAfter);
    const t = window.setTimeout(() => void go(), 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      window.removeEventListener('afterprint', onAfter);
    };
  }, []);

  if (!manualNeeded) return null;

  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        padding: '0.4rem 0.9rem',
        background: '#000',
        color: '#fff',
        border: '1px solid #000',
        fontSize: '0.75rem',
        cursor: 'pointer',
        zIndex: 100,
      }}
    >
      Imprimir / Guardar PDF
    </button>
  );
}
