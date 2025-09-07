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

export type KPIData = {
  totalScenarios: number;
  totalProcessingTime: number;
  avgProcessingTime: number;
  engagementRate: number;
  totalFeedback: number;
  avgFeedbackScore: number;
};