'use client';

/**
 * ExportButton — opens the print-ready Reportes route in a second
 * window with the current range query param so the PDF reflects what
 * the user is looking at on the dashboard.
 *
 * Lives next to RangePicker in the header so the export flow feels
 * like a peer of the range control, not a buried action.
 *
 * Wrapped in <Suspense> because useSearchParams in Next.js App
 * Router triggers a CSR bailout that needs an explicit boundary
 * (otherwise prerender errors during build).
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ExportButtonInner(): React.ReactElement {
  const params = useSearchParams();
  const range = params.get('range') ?? '30d';
  const href = `/print/reportes?range=${encodeURIComponent(range)}`;
  return (
    <button
      type="button"
      onClick={() => window.open(href, '_blank', 'noopener,noreferrer')}
      style={{
        background: '#000',
        color: '#fff',
        border: '1px solid #000',
        padding: '0.4rem 0.8rem',
        fontSize: '0.75rem',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      PDF
    </button>
  );
}

export function ExportButton(): React.ReactElement {
  return (
    <Suspense
      fallback={
        <button
          type="button"
          disabled
          style={{
            background: '#000',
            color: '#fff',
            border: '1px solid #000',
            padding: '0.4rem 0.8rem',
            fontSize: '0.75rem',
            opacity: 0.6,
          }}
        >
          PDF
        </button>
      }
    >
      <ExportButtonInner />
    </Suspense>
  );
}
