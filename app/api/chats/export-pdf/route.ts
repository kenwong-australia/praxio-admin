import { NextRequest } from 'next/server';
import { svc } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { ids, filename } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 10) {
      return new Response('Invalid ids', { status: 400 });
    }

    const sb = svc();
    const { data, error } = await sb
      .from('chat')
      .select('id,created_at,title,scenario,research,questions,draft')
      .in('id', ids);
    if (error) throw error;

    const chats = (data ?? []).sort((a: any, b: any) => ids.indexOf(a.id) - ids.indexOf(b.id));

    const PDFDocument = (await import('pdfkit')).default as any;
    const doc = new PDFDocument({ size: 'A4', margin: 48 });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // Title
    doc.fontSize(18).text('Selected Chats', { align: 'left' });
    doc.moveDown(0.5);

    chats.forEach((c: any, idx: number) => {
      if (idx > 0) doc.addPage();
      const created = new Date(c.created_at).toLocaleString();

      // Chat Title
      doc.fontSize(16).text(c.title?.trim() || 'Untitled', { continued: false });
      doc.moveDown(0.25);
      doc.fontSize(10).fillColor('#666666').text(`Created: ${created}`);
      doc.fillColor('#000000');
      doc.moveDown(0.5);

      // Section helper
      const section = (label: string, value: string) => {
        doc.fontSize(13).text(label, { underline: true });
        doc.moveDown(0.2);
        doc.fontSize(11).text(value && value.trim() ? value : '—', { align: 'left' });
        doc.moveDown(0.5);
      };

      section('Scenario', String(c.scenario || ''));
      section('Research', String(c.research || ''));

      doc.fontSize(13).text('Questions', { underline: true });
      doc.moveDown(0.2);
      if (Array.isArray(c.questions) && c.questions.length) {
        doc.fontSize(11);
        c.questions.forEach((q: any) => {
          doc.circle(doc.x + 2, doc.y + 6, 2).fillAndStroke('#000000', '#000000');
          doc.moveUp(1).moveDown(0);
          doc.text(`   ${String(q)}`, { continued: false });
        });
      } else {
        doc.fontSize(11).text('—');
      }
      doc.moveDown(0.5);

      section('Client Draft', String(c.draft || ''));
    });

    doc.end();

    await new Promise<void>((resolve) => doc.on('end', () => resolve()));
    const buffer = Buffer.concat(chunks);

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${(filename || 'chats_selected')}.pdf"`,
      },
    });
  } catch (e) {
    console.error('export-pdf error', e);
    return new Response('Server error', { status: 500 });
  }
}


