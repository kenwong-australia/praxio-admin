import { createClient } from '@supabase/supabase-js';

/**
 * Main Supabase client with service role key (server-side only)
 * Used for admin operations requiring elevated permissions
 * Do NOT expose the service role key to the browser.
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

/**
 * Per-user Supabase client for RLS-enforced access using a Supabase JWT
 * minted from Firebase (includes user_id/app_role claims).
 *
 * - Expects the caller to supply a valid access token (no refresh here).
 * - Disables session persistence/auto-refresh; caller should refresh the token
 *   and recreate the client when Firebase ID token rotates.
 * - Safe for browser use with anon key and user JWT (RLS enforced).
 */
export function userClient(accessToken: string, opts?: { schema?: string }) {
  if (!accessToken) {
    throw new Error('userClient: accessToken is required');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error('userClient: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createClient(url, anon, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    db: opts?.schema ? { schema: opts.schema } : undefined,
  });
}