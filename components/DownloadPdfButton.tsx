'use client';

import { useState } from 'react';

type Props = {
  targetId: string; // e.g. 'print-area'
};

function makeLocalFilename() {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');

  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());

  // Local timezone abbreviation (e.g., AEST, PDT, GMT+10)
  const tz = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
    .formatToParts(d)
    .find((p) => p.type === 'timeZoneName')?.value || 'TZ';
  const tzClean = tz.replace(/\s+/g, '');

  return `praxio-admin-summary-${yyyy}-${mm}-${dd}-${hh}-${min}-${tzClean}.pdf`;
}

export default function DownloadPdfButton({ targetId }: Props) {
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    const el = document.getElementById(targetId);
    if (!el) return;
    setBusy(true);

    try {
      // client-only dynamic import (keeps SSR/Netlify happy)
      const html2pdf = (await import('html2pdf.js')).default;

      const filename = makeLocalFilename();

      // force white background during render
      el.setAttribute('data-pdf-bg', 'true');

      await html2pdf()
        .from(el)
        .set({
          filename,
          margin: [10, 10, 10, 10], // mm
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        })
        .save();
    } catch (e) {
      console.error('PDF export failed', e);
      alert('Could not generate PDF. Please try again.');
    } finally {
      el.removeAttribute('data-pdf-bg');
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={busy}
      className="rounded-md px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
      title="Download PDF summary"
    >
      {busy ? 'Preparing…' : 'Download PDF'}
    </button>
  );
}