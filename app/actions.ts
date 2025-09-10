'use server';
import { svc } from '@/lib/supabase';
import { z } from 'zod';

const F = z.object({
  email: z.string().nullable(),
  fromISO: z.string(),
  toISO: z.string(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(10).max(100).default(25),
});

export async function getDistinctEmails() {
  try {
    const { data, error } = await svc()
      .from('chat')
      .select('email')
      .not('email', 'is', null)
      .order('email', { ascending: true });
    
    if (error) throw error;
    
    const uniq = Array.from(new Set((data ?? []).map(r => r.email))).filter(Boolean);
    return uniq as string[];
  } catch (error) {
    console.error('Error fetching emails:', error);
    return [];
  }
}

export async function getKPIs(input: unknown) {
  try {
    const f = F.parse(input);
    const sb = svc();

    // Build base query for chats
    let chatsQuery = sb
      .from('chat')
      .select('id,processTime,feedback')
      .gte('created_at', f.fromISO)
      .lte('created_at', f.toISO);
    
    if (f.email) {
      chatsQuery = chatsQuery.eq('email', f.email);
    }

    const { data: chats, error: e1 } = await chatsQuery;

    if (e1) throw e1;
    const chatRows = chats ?? [];

    // Get user messages for engagement calculation
    const chatIds = chatRows.map((c: any) => c.id);
    let userMessagesQuery = sb
      .from('conversation')
      .select('id,chat_id')
      .eq('type', 'user')
      .gte('created_at', f.fromISO)
      .lte('created_at', f.toISO)
      .in('chat_id', chatIds);

    const { data: userMessages, error: e2 } = await userMessagesQuery;
    if (e2) throw e2;

    const userMessageCount = (userMessages ?? []).length;

    const totalScenarios = chatRows.length;
    const times = chatRows.map((c: any) => c.processTime).filter((x: any) => x != null) as number[];
    const totalProcessing = times.reduce((a, b) => a + (b || 0), 0);
    const avgProcessing = times.length > 0 ? totalProcessing / times.length : 0;

    const feedbacks = chatRows.map((c: any) => c.feedback).filter((x: any) => x != null) as number[];
    const totalFeedback = feedbacks.length;
    const avgFeedback = totalFeedback > 0 ? feedbacks.reduce((a, b) => a + b, 0) / totalFeedback : 0;

    // Engagement = (# chats + # user messages) / # chats
    const engagement = totalScenarios > 0 ? (totalScenarios + userMessageCount) / totalScenarios : 0;

    return {
      totalScenarios,
      totalProcessingTime: Number(totalProcessing.toFixed(2)),
      avgProcessingTime: Number(avgProcessing.toFixed(2)),
      engagementRate: Number((engagement * 100).toFixed(1)),
      totalFeedback,
      avgFeedbackScore: Number(avgFeedback.toFixed(2)),
    };
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    return {
      totalScenarios: 0,
      totalProcessingTime: 0,
      avgProcessingTime: 0,
      engagementRate: 0,
      totalFeedback: 0,
      avgFeedbackScore: 0,
    };
  }
}

export async function getLatest5(input: unknown) {
  try {
    const f = F.partial({ page: true, pageSize: true }).parse(input);
    
    let q = svc()
      .from('chat')
      .select('id,created_at,title,email,scenario,research,usedcitationsarray,questions,draft,processtime')
      .gte('created_at', f.fromISO!)
      .lte('created_at', f.toISO!)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (f.email) q = q.eq('email', f.email);
    
    const { data, error } = await q;
    if (error) throw error;
    
    return data ?? [];
  } catch (error) {
    console.error('Error fetching latest 5:', error);
    return [];
  }
}

export async function getScenariosPage(input: unknown) {
  try {
    const f = F.parse(input);
    const offset = (f.page - 1) * f.pageSize;

    let base = svc()
      .from('chat')
      .select('id,created_at,title,email,model,processtime,feedback,scenario,research,usedcitationsarray,questions,draft', { count: 'exact' })
      .gte('created_at', f.fromISO)
      .lte('created_at', f.toISO);

    if (f.email) base = base.eq('email', f.email);

    const { data, error, count } = await base
      .order('created_at', { ascending: false })
      .range(offset, offset + f.pageSize - 1);

    if (error) throw error;
    
    return { rows: data ?? [], total: count ?? 0 };
  } catch (error) {
    console.error('Error fetching scenarios page:', error);
    return { rows: [], total: 0 };
  }
}