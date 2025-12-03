'use client';

import { useState } from 'react';
import { exportElementToPdf, PdfOptions } from '@/lib/pdf';

type Props = {
  targetId: string;               // id of the section to export (e.g., "print-area")
  filenamePrefix: string;         // e.g., "praxio-admin-summary"
  options?: Omit<PdfOptions, 'filenamePrefix'>; // per-page overrides
  className?: string;             // style to match dashboard
};

export default function PdfDownloadButton({ targetId, filenamePrefix, options, className }: Props) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    const el = document.getElementById(targetId);
    if (!el) return;
    setBusy(true);
    try {
      await exportElementToPdf(el as HTMLElement, { filenamePrefix, ...options });
    } catch (e) {
      console.error('PDF export failed', e);
      alert('Could not generate PDF. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className={className ?? 'rounded-md px-3 py-1.5 text-xs h-8 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60'}
      title="Download PDF"
    >
      {busy ? 'Preparing…' : 'Download PDF'}
    </button>
  );
}