'use client';

import { useState } from 'react';
import { exportElementToDocx, extractDataFromElement, DocxOptions, DocxExportData } from '@/lib/docx';

type Props = {
  targetId: string;               // id of the section to export (e.g., "print-area")
  filenamePrefix: string;         // e.g., "praxio-admin-summary"
  options?: Omit<DocxOptions, 'filenamePrefix'>; // per-page overrides
  className?: string;             // style to match dashboard
  // Optional: provide data directly instead of extracting from DOM
  data?: DocxExportData;
};

export default function DocxDownloadButton({ targetId, filenamePrefix, options, className, data }: Props) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    try {
      let exportData: DocxExportData;
      
      if (data) {
        // Use provided data
        exportData = data;
      } else {
        // Extract data from DOM element
        const el = document.getElementById(targetId);
        if (!el) {
          throw new Error(`Element with id "${targetId}" not found`);
        }
        exportData = extractDataFromElement(el);
      }

      await exportElementToDocx(exportData, { filenamePrefix, ...options });
    } catch (e) {
      console.error('DOCX export failed', e);
      alert('Could not generate DOCX. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className={className ?? 'rounded-md px-3 py-1.5 text-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-60'}
      title="Download DOCX"
    >
      {busy ? 'Preparing…' : 'Download DOCX'}
    </button>
  );
}
