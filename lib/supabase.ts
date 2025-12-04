import { createClient } from '@supabase/supabase-js';

/**
 * Main Supabase client with service role key (server-side only)
 * Used for admin operations requiring elevated permissions
 */
export function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // server only
    { auth: { persistSession: false } }
  );
}

/**
 * Supabase client targeting the document_ingest schema
 * Used for document ingestion operations in a separate schema
 */
export function ingest() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      db: { schema: 'document_ingest' },
    }
  );
}