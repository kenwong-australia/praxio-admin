// Client-side helpers for consistent A4 exports using html2pdf.js
export type PdfOptions = {
  filenamePrefix?: string; // e.g., "praxio-admin-summary"
  paper?: { format?: 'a4'|'letter'; orientation?: 'portrait'|'landscape' };
  marginMm?: [number, number, number, number]; // [top,right,bottom,left] in mm
  fixedWidthPx?: number; // content width during export; tuned for A4
  hideSelectors?: string[]; // selectors to hide during export (e.g., '.pdf-hide')
};

export async function exportElementToPdf(el: HTMLElement, opts: PdfOptions = {}) {
  const {
    filenamePrefix = 'export',
    paper = { format: 'a4', orientation: 'portrait' },
    marginMm = [10, 10, 10, 10],
    fixedWidthPx = 794, // ~A4 content width at 96dpi minus margins
    hideSelectors = ['.pdf-hide'],
  } = opts;

  // 1) Fonts & images ready (avoid layout shifts)
  // @ts-ignore
  await (document.fonts?.ready ?? Promise.resolve());
  await Promise.all(
    Array.from(el.querySelectorAll('img')).map(img =>
      img.complete ? Promise.resolve() : new Promise(res => (img.onload = () => res(null)))
    )
  );

  // 2) Enter "PDF mode"
  el.setAttribute('data-pdf-mode', 'on');
  el.style.width = `${fixedWidthPx}px`;
  el.style.margin = '0 auto';

  // Hide interactive blocks
  const hidden: HTMLElement[] = [];
  hideSelectors.forEach(sel =>
    el.querySelectorAll<HTMLElement>(sel).forEach(n => {
      if (getComputedStyle(n).display !== 'none') {
        hidden.push(n);
        (n as any)._pdf_display = n.style.display;
        n.style.display = 'none';
      }
    })
  );

  // 3) Local timestamp + TZ in filename
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const tz = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
    .formatToParts(d).find(p => p.type === 'timeZoneName')?.value?.replace(/\s+/g, '') || 'TZ';
  const filename = `${filenamePrefix}-${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(d.getMinutes())}-${tz}.pdf`;

  // 4) Render & save (dynamic import = client-only)
  const html2pdf = (await import('html2pdf.js')).default;
  await html2pdf()
    .from(el)
    .set({
      filename,
      margin: marginMm,
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: paper.format, orientation: paper.orientation },
      // @ts-expect-error - html2pdf.js types don't include pagebreak option
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    })
    .save();

  // 5) Cleanup
  hidden.forEach(n => (n.style.display = (n as any)._pdf_display || ''));
  el.removeAttribute('data-pdf-mode');
  el.style.width = '';
  el.style.margin = '';
}