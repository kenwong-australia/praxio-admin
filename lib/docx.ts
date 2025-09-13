// Client-side helpers for DOCX exports using docx library
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from 'docx';

export type DocxOptions = {
  filenamePrefix?: string; // e.g., "praxio-admin-summary"
  title?: string; // Document title
  includeTimestamp?: boolean; // Whether to include timestamp in filename
};

export interface KpiData {
  title: string;
  value: string | number;
}

export interface FilterData {
  email?: string | null;
  fromISO: string;
  toISO: string;
}

export interface DocxExportData {
  title: string;
  timestamp: string;
  filters: FilterData;
  kpis: KpiData[];
  companyName?: string;
}

export async function exportElementToDocx(data: DocxExportData, opts: DocxOptions = {}) {
  const {
    filenamePrefix = 'export',
    title = 'Admin Summary',
    includeTimestamp = true,
  } = opts;

  // Generate filename with timestamp if requested
  let filename = filenamePrefix;
  if (includeTimestamp) {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const tz = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
      .formatToParts(d).find(p => p.type === 'timeZoneName')?.value?.replace(/\s+/g, '') || 'TZ';
    filename = `${filenamePrefix}-${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(d.getMinutes())}-${tz}.docx`;
  } else {
    filename = `${filenamePrefix}.docx`;
  }

  // Create document structure
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Header with company name and title
        new Paragraph({
          children: [
            new TextRun({
              text: data.companyName || 'Praxio AI',
              bold: true,
              size: 24,
            }),
          ],
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.LEFT,
        }),
        
        new Paragraph({
          children: [
            new TextRun({
              text: data.title,
              bold: true,
              size: 20,
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.LEFT,
        }),

        // Timestamp
        new Paragraph({
          children: [
            new TextRun({
              text: `Generated on: ${data.timestamp}`,
              italics: true,
              size: 18,
            }),
          ],
          alignment: AlignmentType.LEFT,
        }),

        // Spacing
        new Paragraph({ children: [new TextRun({ text: "" })] }),

        // Filter Summary
        new Paragraph({
          children: [
            new TextRun({
              text: "Filter Summary",
              bold: true,
              size: 18,
            }),
          ],
          heading: HeadingLevel.HEADING_2,
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: `Date Range: ${formatDateRange(data.filters.fromISO, data.filters.toISO)}`,
              size: 16,
            }),
          ],
        }),

        ...(data.filters.email ? [new Paragraph({
          children: [
            new TextRun({
              text: `Email Filter: ${data.filters.email}`,
              size: 16,
            }),
          ],
        })] : []),

        // Spacing
        new Paragraph({ children: [new TextRun({ text: "" })] }),

        // KPIs Section
        new Paragraph({
          children: [
            new TextRun({
              text: "Key Performance Indicators",
              bold: true,
              size: 18,
            }),
          ],
          heading: HeadingLevel.HEADING_2,
        }),

        // KPI Table
        new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          rows: [
            // Header row
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({ text: "Metric", bold: true, size: 16 })],
                    alignment: AlignmentType.CENTER,
                  })],
                  width: { size: 50, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({ text: "Value", bold: true, size: 16 })],
                    alignment: AlignmentType.CENTER,
                  })],
                  width: { size: 50, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            // Data rows
            ...data.kpis.map(kpi => 
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: kpi.title, size: 14 })],
                    })],
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: formatKpiValue(kpi.title, kpi.value), size: 14 })],
                    })],
                  }),
                ],
              })
            ),
          ],
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
            insideVertical: { style: BorderStyle.SINGLE, size: 1 },
          },
        }),

        // Footer note
        new Paragraph({ children: [new TextRun({ text: "" })] }),
        new Paragraph({
          children: [
            new TextRun({
              text: "This report was generated automatically by the Praxio AI Admin Dashboard.",
              italics: true,
              size: 12,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      ],
    }],
  });

  // Generate and download the document
  const buffer = await Packer.toBuffer(doc);
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
  });
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// Helper function to format date range
function formatDateRange(fromISO: string, toISO: string): string {
  const from = new Date(fromISO);
  const to = new Date(toISO);
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };
  
  return `${formatDate(from)} - ${formatDate(to)}`;
}

// Helper function to format KPI values (matches KpiCard formatting)
function formatKpiValue(title: string, value: string | number): string {
  if (typeof value === 'number') {
    if (title.includes('Rate')) {
      return `${value}%`;
    } else if (title.includes('Time')) {
      return `${value}s`;
    } else {
      return value.toLocaleString();
    }
  }
  return String(value);
}

// Helper function to extract data from HTML element (similar to PDF approach)
export function extractDataFromElement(el: HTMLElement): DocxExportData {
  const title = el.querySelector('h2')?.textContent || 'Admin Summary';
  const timestamp = el.querySelector('time')?.textContent || new Date().toLocaleString();
  
  // Extract KPI data from the element
  const kpiCards = el.querySelectorAll('[class*="KpiCard"], .kpi-card, [data-kpi]');
  const kpis: KpiData[] = Array.from(kpiCards).map(card => {
    const titleEl = card.querySelector('h3, .title, [data-title]') || card.querySelector('div:first-child');
    const valueEl = card.querySelector('.value, [data-value], div:last-child');
    
    return {
      title: titleEl?.textContent?.trim() || 'Unknown Metric',
      value: valueEl?.textContent?.trim() || 'N/A'
    };
  });

  // Extract filter data (you might need to adjust selectors based on your FilterSummary component)
  const filterSummary = el.querySelector('[class*="FilterSummary"], .filter-summary');
  const email = filterSummary?.querySelector('[data-email]')?.textContent || null;
  const fromISO = filterSummary?.querySelector('[data-from]')?.textContent || new Date().toISOString();
  const toISO = filterSummary?.querySelector('[data-to]')?.textContent || new Date().toISOString();

  return {
    title,
    timestamp,
    filters: {
      email,
      fromISO,
      toISO
    },
    kpis,
    companyName: 'Praxio AI'
  };
}
