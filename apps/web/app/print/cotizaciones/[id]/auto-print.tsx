'use client';

/**
 * AutoPrint — tiny client island that opens the browser's native
 * print dialog as soon as the print sheet is rendered and fonts are
 * settled. Users flow:
 *
 *   Click "Vista previa / Imprimir" on a quote row
 *     → new tab opens /workspace/cotizaciones/<id>/print
 *     → print dialog appears
 *     → user saves as PDF (macOS / Chrome / Edge) or prints directly
 *     → tab closes itself on afterprint
 *
 * We wait for `document.fonts.ready` before firing so the logo +
 * first render of item rows don't reflow inside the PDF.
 *
 * A manual "Imprimir" button also renders as a fallback in case the
 * auto-call is blocked (Safari is strict about window.print from
 * background tabs).
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

    const onAfter = () => {
      // Close the tab once printing is done so "Ver / Imprimir" feels
      // like a single action. The window.close() is only honored for
      // tabs the script opened (window.open), which is our case.
      window.close();
    };
    window.addEventListener('afterprint', onAfter);

    // Slight delay prevents Safari from suppressing print() when the
    // tab opens without user gesture on the new page.
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
