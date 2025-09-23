import { NextRequest } from 'next/server';
import { svc } from '@/lib/supabase';
import { Document, Packer, Paragraph, HeadingLevel, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';

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

    const sections: any[] = [];
    sections.push(new Paragraph({ text: 'Selected Chats', heading: HeadingLevel.TITLE }));

    for (const c of chats) {
      sections.push(new Paragraph({ text: '' }));
      sections.push(new Paragraph({ text: c.title?.trim() || 'Untitled', heading: HeadingLevel.HEADING_1 }));
      sections.push(new Paragraph({ text: `Created: ${new Date(c.created_at).toLocaleString()}`, children: [] }));

      sections.push(new Paragraph({ text: 'Scenario', heading: HeadingLevel.HEADING_2 }));
      sections.push(new Paragraph({ text: c.scenario?.trim() || '—' }));

      sections.push(new Paragraph({ text: 'Research', heading: HeadingLevel.HEADING_2 }));
      sections.push(new Paragraph({ text: c.research?.trim() || '—' }));

      sections.push(new Paragraph({ text: 'Questions', heading: HeadingLevel.HEADING_2 }));
      if (Array.isArray(c.questions) && c.questions.length) {
        for (const q of c.questions) sections.push(new Paragraph({ text: `• ${String(q)}` }));
      } else {
        sections.push(new Paragraph({ text: '—' }));
      }

      sections.push(new Paragraph({ text: 'Client Draft', heading: HeadingLevel.HEADING_2 }));
      sections.push(new Paragraph({ text: c.draft?.trim() || '—' }));
    }

    const doc = new Document({ sections: [{ children: sections }] });
    const buffer = await Packer.toBuffer(doc);

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${(filename || 'chats_selected')}.docx"`,
      },
    });
  } catch (e) {
    console.error('export-docx error', e);
    return new Response('Server error', { status: 500 });
  }
}


