export type ChatRow = {
  id: number;
  created_at: string;
  title: string | null;
  scenario: string | null;
  email: string | null;
  model: string | null;
  processTime: number | null; // seconds
  feedback: number | null;    // -1..+1
};

export type ConversationRow = {
  id: number;
  created_at: string;
  type: 'user' | 'assistant' | string;
  content: string;
  chat_id: number;
};

export type Filters = {
  email: string | null;    // null = All users
  fromISO: string;         // UTC ISO, inclusive
  toISO: string;           // UTC ISO, inclusive
  page: number;            // default 1
  pageSize: number;        // default 25
};

export type User = {
  uid: string;
  email: string;
  display_name: string;
  photo_url: string;
  created_time: Date;
  phone_number: string;
  email_verified: boolean;
  first_name: string;
  last_name: string;
  bio: string;
  company_name: string;
  abn_num: string;
  state: string;
  city: string;
  workspace: string;
  stripe_cust_id: string;
  selected_plan: string;
  selected_frequency: string;
  stripe_subscription_id: string;
  stripe_subscription_status: string;
  stripe_subscription_product_id: string;
  stripe_subscription_price_id: string;
  role: string;
  stripe_trial_end_date: Date;
  stripe_plan_renewal_date: Date;
  latest_build: string;
  last_activity: Date;
  number_chats: number;
  stripe_cancel_at_period_end: boolean;
  stripe_pending_frequency: string;
  has_received_welcome: boolean;
  client_template: string;
  // Optional, computed at fetch time: whether this user exists in Supabase
  in_supabase?: boolean;
};

export type UserFilters = {
  search?: string;
  role?: string;
  plan?: string;
  state?: string;
  fromISO?: string;
  toISO?: string;
  page: number;
  pageSize: number;
};

export type UserStats = {
  totalUsers: number;
  activeUsers: number;
  newSignups: number;
  paidUsers: number;
  avgChatsPerUser: number;
  userEngagement: number;
};

export type KPIData = {
  totalScenarios: number;
  totalProcessingTime: number;
  avgProcessingTime: number;
  engagementRate: number;
  totalFeedback: number;
  avgFeedbackScore: number;
};