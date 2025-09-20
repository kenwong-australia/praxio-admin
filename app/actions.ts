'use server';
import { svc } from '@/lib/supabase';
import { getAdminDb } from '@/lib/firebase';
import { z } from 'zod';
import { User, UserFilters, UserStats } from '@/lib/types';

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
      .select('id,created_at,title,email,scenario,research,usedcitationsArray,questions,draft,processTime,feedback,comment_selection,comment_additional')
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
      .select('id,created_at,title,email,model,processTime,feedback,scenario,research,usedcitationsArray,questions,draft,comment_selection,comment_additional', { count: 'exact' })
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

// User management functions
export async function getUsers(input: unknown) {
  try {
    console.log('getUsers called with input:', input);
    
    const f = z.object({
      search: z.string().optional(),
      role: z.string().optional(),
      plan: z.string().optional(),
      state: z.string().optional(),
      fromISO: z.string().optional(),
      toISO: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(25),
    }).parse(input);

    console.log('Parsed filters:', f);

    const db = getAdminDb();
    const usersRef = db.collection('users');
    
    console.log('Firebase DB initialized, usersRef created');
    
    let query: any = usersRef;
    
    // Apply filters
    if (f.search) {
      query = query.where('email', '>=', f.search).where('email', '<=', f.search + '\uf8ff');
    }
    if (f.role) {
      query = query.where('role', '==', f.role);
    }
    if (f.plan) {
      query = query.where('selected_plan', '==', f.plan);
    }
    if (f.state) {
      query = query.where('state', '==', f.state);
    }
    if (f.fromISO) {
      query = query.where('created_time', '>=', new Date(f.fromISO));
    }
    if (f.toISO) {
      query = query.where('created_time', '<=', new Date(f.toISO));
    }
    
    // Order by created_time descending
    query = query.orderBy('created_time', 'desc');
    
    // Pagination
    const offset = (f.page - 1) * f.pageSize;
    console.log('Executing query with offset:', offset, 'limit:', f.pageSize);
    
    const snapshot = await query.offset(offset).limit(f.pageSize).get();
    console.log('Query executed, got', snapshot.docs.length, 'documents');
    
    const users = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      created_time: doc.data().created_time?.toDate(),
      last_activity: doc.data().last_activity?.toDate(),
      stripe_trial_end_date: doc.data().stripe_trial_end_date?.toDate(),
      stripe_plan_renewal_date: doc.data().stripe_plan_renewal_date?.toDate(),
    })) as unknown as User[];
    
    console.log('Mapped users:', users.length);
    
    // Get total count (this is expensive, so we'll estimate)
    const totalSnapshot = await usersRef.get();
    const total = totalSnapshot.size;
    console.log('Total users in collection:', total);
    
    return { rows: users, total };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { rows: [], total: 0 };
  }
}

export async function getUserStats(input: unknown) {
  try {
    console.log('getUserStats called with input:', input);
    
    const f = z.object({
      fromISO: z.string().optional(),
      toISO: z.string().optional(),
    }).parse(input);

    console.log('Parsed stats filters:', f);

    const db = getAdminDb();
    const usersRef = db.collection('users');
    
    console.log('Firebase DB initialized for stats, usersRef created');
    
    let query: any = usersRef;
    
    if (f.fromISO) {
      query = query.where('created_time', '>=', new Date(f.fromISO));
    }
    if (f.toISO) {
      query = query.where('created_time', '<=', new Date(f.toISO));
    }
    
    const snapshot = await query.get();
    const users = snapshot.docs.map((doc: any) => doc.data());
    
    const totalUsers = users.length;
    const activeUsers = users.filter((user: any) => {
      const lastActivity = user.last_activity?.toDate();
      if (!lastActivity) return false;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return lastActivity > thirtyDaysAgo;
    }).length;
    
    const newSignups = users.filter((user: any) => {
      const createdTime = user.created_time?.toDate();
      if (!createdTime) return false;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return createdTime > thirtyDaysAgo;
    }).length;
    
    const paidUsers = users.filter((user: any) => 
      user.stripe_subscription_status === 'active' || 
      user.stripe_subscription_status === 'trialing'
    ).length;
    
    const totalChats = users.reduce((sum: number, user: any) => sum + (user.number_chats || 0), 0);
    const avgChatsPerUser = totalUsers > 0 ? totalChats / totalUsers : 0;
    
    const userEngagement = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
    
    return {
      totalUsers,
      activeUsers,
      newSignups,
      paidUsers,
      avgChatsPerUser: Number(avgChatsPerUser.toFixed(2)),
      userEngagement: Number(userEngagement.toFixed(1)),
    } as UserStats;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return {
      totalUsers: 0,
      activeUsers: 0,
      newSignups: 0,
      paidUsers: 0,
      avgChatsPerUser: 0,
      userEngagement: 0,
    } as UserStats;
  }
}

export async function getUserDetails(uid: string) {
  try {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return null;
    }
    
    const userData = userDoc.data();
    return {
      id: userDoc.id,
      ...userData,
      created_time: userData?.created_time?.toDate(),
      last_activity: userData?.last_activity?.toDate(),
      stripe_trial_end_date: userData?.stripe_trial_end_date?.toDate(),
      stripe_plan_renewal_date: userData?.stripe_plan_renewal_date?.toDate(),
    } as unknown as User;
  } catch (error) {
    console.error('Error fetching user details:', error);
    return null;
  }
}