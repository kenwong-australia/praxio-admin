'use server';
import { svc, ingest } from '@/lib/supabase';
import { getAdminDb, getAdminAuth } from '@/lib/firebase';
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
      status: z.string().optional(),
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
      // Interpret as frequency filter (exact matches used in DB)
      const p = (f.plan || '').trim();
      if (p.toUpperCase() === 'N/A') {
        query = query.where('selected_frequency', '==', '');
      } else {
        query = query.where('selected_frequency', '==', p.toLowerCase());
      }
    }
    if (f.status) {
      // Exact matches used in DB
      const s = (f.status || '').trim().toLowerCase();
      query = query.where('stripe_subscription_status', '==', s);
    }
    if (f.fromISO) {
      query = query.where('created_time', '>=', new Date(f.fromISO));
    }
    if (f.toISO) {
      query = query.where('created_time', '<=', new Date(f.toISO));
    }
    
    // Order rules to avoid composite index requirements that blank the list:
    // - If using a search range on email, Firestore requires orderBy on the same field
    // - If any equality filters are present (role/plan/status), omit created_time ordering to avoid composite index for now
    // - If no filters, order by created_time desc (default view)
    const hasEqualityFilters = Boolean(f.role || f.plan || f.status);
    if (f.search) {
      query = query.orderBy('email');
    } else if (!hasEqualityFilters) {
      query = query.orderBy('created_time', 'desc');
    }
    
    // No pagination: fetch all matching users for now
    console.log('Executing query without pagination (temporary full fetch)');
    const snapshot = await query.get();
    console.log('Query executed, got', snapshot.docs.length, 'documents');
    
    const toDateSafe = (v: any) => {
      if (!v) return undefined;
      if (v instanceof Date) return v;
      if (typeof v?.toDate === 'function') return v.toDate();
      return undefined;
    };

    const users = snapshot.docs.map((doc: any) => {
      const d = doc.data() || {};
      const u: Partial<User> & { uid: string } = {
        // Identity
        uid: String(doc.id),

        // Core profile fields shown in UI
        email: typeof d.email === 'string' ? d.email : '',
        display_name: typeof d.display_name === 'string' ? d.display_name : '',
        photo_url: typeof d.photo_url === 'string' ? d.photo_url : '',
        first_name: typeof d.first_name === 'string' ? d.first_name : '',
        last_name: typeof d.last_name === 'string' ? d.last_name : '',
        phone_number: typeof d.phone_number === 'string' ? d.phone_number : '',
        abn_num: typeof d.abn_num === 'string' ? d.abn_num : '',
        company_name: typeof d.company_name === 'string' ? d.company_name : '',
        email_verified: Boolean(d.email_verified),

        // Dates (as JS Date objects)
        created_time: toDateSafe(d.created_time) as any,
        last_activity: toDateSafe(d.last_activity) as any,
        stripe_trial_end_date: toDateSafe(d.stripe_trial_end_date) as any,
        stripe_plan_renewal_date: toDateSafe(d.stripe_plan_renewal_date) as any,

        // Billing / role
        selected_frequency: typeof d.selected_frequency === 'string' ? d.selected_frequency : '',
        stripe_subscription_status: typeof d.stripe_subscription_status === 'string' ? d.stripe_subscription_status : '',
        role: typeof d.role === 'string' ? d.role : 'regular',
        number_chats: typeof d.number_chats === 'number' ? d.number_chats : 0,
        stripe_cancel_at_period_end: Boolean(d.stripe_cancel_at_period_end),
        stripe_pending_frequency: typeof d.stripe_pending_frequency === 'string' ? d.stripe_pending_frequency : '',
        client_template: typeof d.client_template === 'string' ? d.client_template : '',
      };
      return u as User;
    });
    
    console.log('Mapped users:', users.length);
    
    // ==============================
    // Supabase presence (per page)
    // ==============================
    try {
      const uids = Array.from(new Set((users.map(u => (u as any).uid).filter(Boolean))));
      const emails = Array.from(new Set((users.map(u => (u as any).email).filter(Boolean))));

      let sbRows: { id?: string; email?: string | null }[] = [];
      if (uids.length > 0 || emails.length > 0) {
        const quote = (s: string) => `"${String(s).replace(/"/g, '\\"')}"`;
        const parts: string[] = [];
        if (uids.length) parts.push(`id.in.(${uids.map(quote).join(',')})`);
        if (emails.length) parts.push(`email.in.(${emails.map(quote).join(',')})`);

        const { data, error } = await svc()
          .from('user')
          .select('id,email')
          .or(parts.join(','));
        if (error) {
          console.error('Supabase presence check error:', error);
        } else {
          sbRows = data ?? [];
        }
      }

      const sbIdSet = new Set((sbRows ?? []).map(r => r.id).filter(Boolean));
      const sbEmailSet = new Set((sbRows ?? []).map(r => (r.email ?? '').toLowerCase()).filter(Boolean));

      for (const u of users as any[]) {
        const emailLower = (u.email ?? '').toLowerCase();
        u.in_supabase = sbIdSet.has(u.uid) || sbEmailSet.has(emailLower);
      }
    } catch (e) {
      console.error('Supabase presence check failed:', e);
    }

    // ======================================
    // Supabase chat counts (per page, RPC)
    // ======================================
    try {
      const uids = Array.from(new Set((users.map(u => (u as any).uid).filter(Boolean))));
      if (uids.length > 0) {
        const { data, error } = await svc().rpc('get_chat_counts', { user_ids: uids });
        if (error) {
          console.error('get_chat_counts RPC error:', error);
        } else {
          const map = new Map<string, number>((data ?? []).map((r: any) => [r.user_id, Number(r.chat_count)]));
          for (const u of users as any[]) {
            u.supabase_chat_count = map.get(u.uid) ?? 0;
          }
        }
      }
    } catch (e) {
      console.error('Supabase chat count fetch failed:', e);
    }
    
    // Total equals full collection size (unchanged)
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
    
    const f = z.object({}).parse(input);

    console.log('Parsed stats filters:', f);

    const db = getAdminDb();
    const usersRef = db.collection('users');
    
    console.log('Firebase DB initialized for stats, usersRef created');
    
    const snapshot = await usersRef.get();
    const users = snapshot.docs.map((doc: any) => doc.data());
    
    const totalUsers = users.length;
    const activeUsers = users.filter((user: any) => !!user.last_activity?.toDate()).length;
    
    const newSignups = (() => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime());
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return users.filter((user: any) => {
        const createdTime = user.created_time?.toDate();
        return createdTime && createdTime > thirtyDaysAgo;
      }).length;
    })();
    
    const paidUsers = users.filter((user: any) => user.stripe_subscription_status === 'active').length;

    const conversion = (() => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime());
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const signupsLast30 = users.filter((user: any) => {
        const createdTime = user.created_time?.toDate();
        return createdTime && createdTime > thirtyDaysAgo;
      });
      const activeAmongNew = signupsLast30.filter((u: any) => u.stripe_subscription_status === 'active').length;
      return signupsLast30.length > 0 ? Number(((activeAmongNew / signupsLast30.length) * 100).toFixed(1)) : 0;
    })();
    
    // Avg Chats/User: compute from Supabase (all-time): total chats / distinct users with chats
    let avgChatsPerUser = 0;
    try {
      const { data, error } = await svc().rpc('chat_aggregate');
      if (!error && Array.isArray(data) && data.length > 0) {
        const totalChatsSb = Number((data[0] as any).total_chats) || 0;
        const distinctUsersSb = Number((data[0] as any).distinct_users) || 0;
        avgChatsPerUser = distinctUsersSb > 0 ? totalChatsSb / distinctUsersSb : 0;
      } else if (error) {
        console.error('chat_aggregate RPC error:', error);
      }
    } catch (e) {
      console.error('Supabase avg chats aggregation failed, falling back to Firestore estimate:', e);
      const totalChats = users.reduce((sum: number, user: any) => sum + (user.number_chats || 0), 0);
      const usersWithChats = users.filter((user: any) => (user.number_chats || 0) > 0).length;
      avgChatsPerUser = usersWithChats > 0 ? totalChats / usersWithChats : 0;
    }
    
    const userEngagement = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
    
    return {
      totalUsers,
      activeUsers,
      newSignups,
      paidUsers,
      conversion,
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
    
    const userData = userDoc.data() || {};
    const toDateSafe = (v: any) => (v && typeof v?.toDate === 'function') ? v.toDate() : undefined;
    return {
      uid: String(userDoc.id),
      email: typeof userData.email === 'string' ? userData.email : '',
      display_name: typeof userData.display_name === 'string' ? userData.display_name : '',
      photo_url: typeof userData.photo_url === 'string' ? userData.photo_url : '',
      created_time: toDateSafe(userData.created_time) as any,
      phone_number: typeof userData.phone_number === 'string' ? userData.phone_number : '',
      email_verified: Boolean(userData.email_verified),
      first_name: typeof userData.first_name === 'string' ? userData.first_name : '',
      last_name: typeof userData.last_name === 'string' ? userData.last_name : '',
      bio: typeof userData.bio === 'string' ? userData.bio : '',
      company_name: typeof userData.company_name === 'string' ? userData.company_name : '',
      abn_num: typeof userData.abn_num === 'string' ? userData.abn_num : '',
      state: typeof userData.state === 'string' ? userData.state : '',
      city: typeof userData.city === 'string' ? userData.city : '',
      workspace: typeof userData.workspace === 'string' ? userData.workspace : '',
      stripe_cust_id: typeof userData.stripe_cust_id === 'string' ? userData.stripe_cust_id : '',
      selected_plan: typeof userData.selected_plan === 'string' ? userData.selected_plan : '',
      selected_frequency: typeof userData.selected_frequency === 'string' ? userData.selected_frequency : '',
      stripe_subscription_id: typeof userData.stripe_subscription_id === 'string' ? userData.stripe_subscription_id : '',
      stripe_subscription_status: typeof userData.stripe_subscription_status === 'string' ? userData.stripe_subscription_status : '',
      stripe_subscription_product_id: typeof userData.stripe_subscription_product_id === 'string' ? userData.stripe_subscription_product_id : '',
      stripe_subscription_price_id: typeof userData.stripe_subscription_price_id === 'string' ? userData.stripe_subscription_price_id : '',
      role: typeof userData.role === 'string' ? userData.role : 'regular',
      stripe_trial_end_date: toDateSafe(userData.stripe_trial_end_date) as any,
      stripe_plan_renewal_date: toDateSafe(userData.stripe_plan_renewal_date) as any,
      latest_build: typeof userData.latest_build === 'string' ? userData.latest_build : '',
      last_activity: toDateSafe(userData.last_activity) as any,
      number_chats: typeof userData.number_chats === 'number' ? userData.number_chats : 0,
      stripe_cancel_at_period_end: Boolean(userData.stripe_cancel_at_period_end),
      stripe_pending_frequency: typeof userData.stripe_pending_frequency === 'string' ? userData.stripe_pending_frequency : '',
      has_received_welcome: Boolean(userData.has_received_welcome),
      client_template: typeof userData.client_template === 'string' ? userData.client_template : '',
    } as unknown as User;
  } catch (error) {
    console.error('Error fetching user details:', error);
    return null;
  }
}

// ==========================
// Admin: verify user email
// ==========================
export async function verifyEmailByEmail(input: { uid: string; email: string }) {
  try {
    const { uid, email } = input;
    const auth = getAdminAuth();

    // Look up by email from Auth, and verify UIDs match
    const authUser = await auth.getUserByEmail(email);
    if (authUser.uid !== uid) {
      return { ok: false, error: 'UID mismatch between provided UID and Firebase Auth record for this email.' };
    }

    // Double-check Firestore has this UID and (optionally) matching email
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return { ok: false, error: 'Firestore user not found for provided UID.' };
    }
    const fsEmail = (userDoc.data() as any)?.email;
    if (fsEmail && fsEmail !== email) {
      return { ok: false, error: 'Email mismatch between Firestore and the provided email.' };
    }

    // Flip Auth emailVerified and mirror in Firestore
    await auth.updateUser(uid, { emailVerified: true });
    await db.collection('users').doc(uid).set({ email_verified: true }, { merge: true });

    return { ok: true, uid, email };
  } catch (error: any) {
    console.error('verifyEmailByEmail error:', error);
    return { ok: false, error: error?.message || 'Unknown error' };
  }
}

// ==========================
// Document ingest (VB) logs
// ==========================

const VBFilters = z.object({
  component: z.string().nullable().default(null),
  level: z.string().nullable().default(null),
  event: z.string().nullable().default(null),
  topic: z.string().nullable().default(null),
  fromISO: z.string(),
  toISO: z.string(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(10).max(100).default(25),
});

export type VBRunRow = {
  run_id: string;
  component: string | null;
  started_at: string | null;
  finished_at: string | null;
  totals: any | null;
};

export type VBEventRow = {
  id: number;
  run_id: string | null;
  timestamp: string | null;
  component: string | null;
  level: string | null;
  event: string | null;
  message: string | null;
  topic: string | null;
  file_id: string | null;
  doc_id: string | null;
  act_title: string | null;
  act_short: string | null;
  section: string | null;
  url: string | null;
  namespace: string | null;
  payload: any | null;
};

export async function getVBRuns(input: unknown) {
  const f = VBFilters.pick({ component: true, fromISO: true, toISO: true, page: true, pageSize: true }).parse(input);
  const sb = ingest();
  const from = f.fromISO;
  const to = f.toISO;
  const offset = (f.page - 1) * f.pageSize;

  let query = sb
    .from('runs')
    .select('run_id,component,started_at,finished_at,totals', { count: 'exact' })
    .gte('started_at', from)
    .lte('started_at', to)
    .order('started_at', { ascending: false });

  if (f.component) query = query.eq('component', f.component);

  const { data, error, count } = await query.range(offset, offset + f.pageSize - 1);
  if (error) {
    console.error('getVBRuns error', error);
    return { rows: [] as VBRunRow[], total: 0 };
  }
  return { rows: (data ?? []) as VBRunRow[], total: count ?? 0 };
}

export async function getVBEvents(input: unknown) {
  const f = VBFilters.parse(input);
  const sb = ingest();
  const offset = (f.page - 1) * f.pageSize;

  let query = sb
    .from('events')
    .select('*', { count: 'exact' })
    .gte('timestamp', f.fromISO)
    .lte('timestamp', f.toISO)
    .order('timestamp', { ascending: false });

  if (f.component) query = query.eq('component', f.component);
  if (f.level) query = query.eq('level', f.level);
  if (f.event) query = query.eq('event', f.event);
  if (f.topic) query = query.eq('topic', f.topic);
  if (f.search && f.search.trim()) {
    // do a case-insensitive search over message and url
    const s = f.search.trim();
    query = query.or(
      `message.ilike.%${s}%,url.ilike.%${s}%`
    );
  }

  const { data, error, count } = await query.range(offset, offset + f.pageSize - 1);
  if (error) {
    console.error('getVBEvents error', error);
    return { rows: [] as VBEventRow[], total: 0 };
  }
  return { rows: (data ?? []) as VBEventRow[], total: count ?? 0 };
}